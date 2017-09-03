var prompt = require('prompt');
var fs = require('fs');

const {exec} = require( 'child_process' )
const sha256 = require('sha256')

var sBal = 100
var pAmount = 30
var rBal = 50

function handleExecuteProgram(programName, msgStart, msgEnd, msgError, cb){
  console.log(msgStart)
  exec(programName, (error, stdout, stderr) => {
    console.log(`stdout: ${stdout}`)
    if (error) {
      console.error(`exec error: ${error}`)
      console.log(msgError)
    }
    if(stderr){
      console.log(`stderr: ${stderr}`)
      console.log(msgError)
    }
    console.log(msgEnd)
    cb()
  });
}

function generateProofInputs(r1, r2, r3, fileName, cb){

  //proof is that r1+r2=r3
  var arr_r1 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, r1, 202, 5, 190, 15, 140, 211, 75, 131, 62, 136, 12, 6, 17, 4, 10, 18]
  var arr_r2 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, r2, 6, 171, 218, 43, 241, 15, 217, 251, 205, 248, 0, 21, 86, 194, 100, 94]
  var arr_r3 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, r3, 200, 1, 111, 160, 141, 10, 73, 36, 65, 16, 15, 6, 17, 2, 11, 8]

  var r1_b = Buffer.from(arr_r1)
  var r2_b = Buffer.from(arr_r2)
  var r3_b = Buffer.from(arr_r3)

  var r1_i = parseInt(r1_b.toString('hex'), 16)
  var r2_i = parseInt(r2_b.toString('hex'), 16)
  var r3_i = parseInt(r3_b.toString('hex'), 16)

  var h1_b = sha256(r1_b, {asBytes: true})
  var h2_b = sha256(r2_b, {asBytes: true})
  var h3_b = sha256(r3_b, {asBytes: true})

  var inputParameters = h1_b.toString().replace(/,/g, ' ') + "\n";
  inputParameters += h2_b.toString().replace(/,/g, ' ') + "\n";
  inputParameters += h3_b.toString().replace(/,/g, ' ') + "\n";
  inputParameters += arr_r1.toString().replace(/,/g, ' ') + "\n";
  inputParameters += arr_r2.toString().replace(/,/g, ' ') + "\n";
  inputParameters += arr_r3.toString().replace(/,/g, ' ');
  fs.writeFile(fileName, inputParameters, function(err) {
    if(err) {
      cb('An error occured generating the input parameters:',err);
    } else {
      cb('The input parameters were succesfully generated and saved to the file: ' + fileName, null);
    }
  }); 
}

function handleUpdateOpeningBalancesAndPaymentAmount(cb){
  console.log('Please enter the senders starting balance')
  prompt.get(['option'], function(err, sendersBalance){
    console.log('Please enter the receivers starting balance')
    prompt.get(['option'], function(err, receiversBalance){
      console.log('Please enter the amount that is being paid')
      prompt.get(['option'], function(err, paymentAmount){
        sBal = parseInt(sendersBalance.option)
        rBal = parseInt(receiversBalance.option)
        pAmount = parseInt(paymentAmount.option)
        cb()
      })
    })
  })
}

function handleGenerateSendPaymentProof(cb){
  generateProofInputs((sBal - pAmount), pAmount, sBal, 'sendProofInputs', function(msg, err){
    if(err){
      console.log(msg, err)
      cb()
    } else {
      console.log(msg)
      handleExecuteProgram('./generateProof sendProof sendProofInputs', 'Loading Proving Key from file... (this takes a few seconds)', '', 'The proof generation failed\n\n', function(){
        cb()
      })
    }
  })
}

function handleGenerateReceivePaymentProof(cb){
  generateProofInputs(rBal, pAmount, (rBal + pAmount), 'receiveProofInputs', function(msg, err){
    if(err){
      console.log(msg, err)
      cb()
    } else {
      console.log(msg)
      handleExecuteProgram('./generateProof receiveProof receiveProofInputs', 'Loading Proving Key from file... (this takes a few seconds)', '', 'The proof generation failed\n\n', function(){
        cb()
      })
    }
  })
}

function handleInput(){
  console.log('Please select an option:\n1) Update start balances and payment amount\n2) Create a new key pair\n3) Generate a send payment proof\n4) Generate a receive payment proof\n5) Verify a send payment proof\n6) Verify a receive payment proof\n0) Quit')
  prompt.get(['option'], function(err, answer){
    if(answer.option == 1){
      handleUpdateOpeningBalancesAndPaymentAmount(function(){
        handleInput()
      })
    } else if(answer.option == 2){
      handleExecuteProgram('./generateKeyPair', 'Generating key pair...', 'The key pair has been generated and the keys written to files (provingKey and verificationKey)', 'The key pair failed\n\n', function(){
        handleInput()
      })
    } else if (answer.option == 3){
      handleGenerateSendPaymentProof(function(){
        handleInput()
      })
    } else if (answer.option == 4){
      handleGenerateReceivePaymentProof(function(){
        handleInput()
      })
    } else if(answer.option == 5){
      handleExecuteProgram('./verifyProof sendProof sendProofInputs', '', '', 'The proof verification failed\n\n', function(){
        handleInput()
      })
    } else if(answer.option == 6){
      handleExecuteProgram('./verifyProof receiveProof receiveProofInputs', '', '', 'The proof verification failed\n\n', function(){
        handleInput()
      })
    } else {
      console.log('Quiting...')
    }
  })
}

handleInput()
