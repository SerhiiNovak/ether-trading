var express = require('express');
var app = express();
var bodyParser = require('body-parser');
const cors = require('cors');
const http = require ('http');
const ethers = require("ethers");
const { ERC20_ABI } = require("./erc20.js");
console.log("db");
const contracts = require("./contracts.js");
require('dotenv').config();

var events = require('events');

var eventEmitter = new events.EventEmitter();

const sleep = (milliseconds) => {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

var port = process.env.PORT || 8080;

app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(cors());
app.use(contracts);
function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
  }

async function doSwapAction(data) {
    // console.log("Info : ", data.address,
    //         data.tokenaddress,
    //         data.slippage,
    //         data.gaslimit,
    //         data.gasprice);

     // var customWsProvider = new ethers.providers.WebSocketProvider(process.env.NODEURL);
     const provider = new ethers.providers.JsonRpcProvider(process.env.mainnetURL);

     var ethWallet = new ethers.Wallet(process.env.privKey);
     const account = ethWallet.connect(provider);
     const router = new ethers.Contract(
     process.env.PCS_ROUTER_ADDR,
     [
         "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
         "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
         "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
         "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin,address[] calldata path,address to, uint deadline) external payable",
         "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
         "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
         "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
     ],
     account
     );
    
     let tokenContract = new ethers.Contract(data.tokenaddress, ERC20_ABI, account);
    // Create random 
    // let bnbAmount = randomIntFromInterval(1, 100)/100;
    let bnbAmount = randomIntFromInterval(2, 100)/100;
    const amountIn = ethers.utils.parseUnits(bnbAmount.toString(), "ether");

    let rndInt = randomIntFromInterval(1, 2);

    if(rndInt === 1){ // This is buy 
        console.log("Info: buy swap with BNB - ", bnbAmount);

        let txBuy = await router
            .swapExactETHForTokens(
            0,
            [process.env.WBNB_ADDR, data.tokenaddress],
            data.address,
            Date.now(),
            {
                gasLimit: data.gaslimit.toString(),
                gasPrice: ethers.utils.parseUnits(`${data.gasprice}`, "gwei"),
                value: amountIn.toString()
            }
            )
            .catch((err) => {
                console.log("Error: transaction failed.", err);
            });
        txBuy.wait();

    }else{ // This is sell 
        console.log("Info: sell swap");
        // var customWsProvider = new ethers.providers.WebSocketProvider(process.env.NODEURL);
       
        let tokenamount_router = await router.getAmountsOut(amountIn, [process.env.WBNB_ADDR, data.tokenaddress]);
        // console.log("Wbnb amount", bnbAmount);
        // console.log("swap token amount", ethers.utils.formatEther(tokenamount_router[1].toString()));
        let tokenbalance_wallet = await tokenContract.balanceOf(data.address);

        // console.log("wallet token amount", ethers.utils.formatEther(tokenbalance_wallet.toString()));

        console.log("Info: sell Swap: WBNB - ", bnbAmount, "Token - ", ethers.utils.formatEther(tokenamount_router[1].toString()));

        if(tokenamount_router[1] > tokenbalance_wallet){
            console.log("Info: current token balance in wallet - ", ethers.utils.formatEther(tokenbalance_wallet.toString()));
            console.log("Warn: Insufficient Token in wallet.");
        }else{
            let amount = await tokenContract.allowance(data.address, process.env.PCS_ROUTER_ADDR);
            if (
                amount <
                115792089237316195423570985008687907853269984665640564039457584007913129639935
            ) {
                try {
                    const approve = await tokenContract.approve(
                        process.env.PCS_ROUTER_ADDR,
                        ethers.BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"),
                        {   gasLimit: 100000,
                            gasPrice: ethers.utils.parseUnits(`10`, "gwei") }
                    ).catch((err) => {
                        console.log(err);
                        console.log("Error: token approve failed");
                    });
                    await approve.wait();
                }catch(err){
                    console.log(err)
                }
            }
            
            //const sellAmountIn = ethers.utils.parseUnits(`${data.selltokenAmount}`, "ether");
    
            let txSell = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
                tokenamount_router[1],
                0,
                [ data.tokenaddress, process.env.WBNB_ADDR ],
                data.address,
                Date.now(),
                {
                    gasLimit: data.gaslimit,
                    gasPrice: ethers.utils.parseUnits(`${data.gasprice}`, "gwei"),
                }
            )
            .catch((err) => {
                console.log(`${err}`);
                return;
            });

            txSell.wait();
        }
        
    }
}

app.post('/swapstart', async(req, res) => {
    let flag = true;
    eventEmitter.on('swap', (token) => {
        flag = false;
        res.status(200).json({
            "func": "/swap_start",
            "value": token,
            "time": Date.now()
        });
    });

    while(flag){
        doSwapAction(req.body);
        console.log("Info: swap loop started");

        //let timeRnd = randomIntFromInterval(60, 3600); // 60 s ~ 3600 s
        let timeRnd = randomIntFromInterval(10, 60); // 10 s ~ 60 s
        console.log("Info: next swap will be after ", timeRnd, "seconds.");
        await sleep(timeRnd * 1000);
    }

    console.log("Info: swap action stopped.");
});

app.post('/swapstop', (req, res) => {
    var token = 1;
    eventEmitter.emit('swap', token);
    res.status(200).json({
        "func": "/swap_stop",
        "value": token,
        "time": Date.now()
    });

});

// index path
app.post('/', function(req, res){
    console.log('Info: backend listening on port: '+ port);
    res.send('tes express nodejs sqlite')
});

const server = http.createServer(app);

server.listen(port, function(){
    console.log('Info: backend listening on port: '+ port);
});

global.snipSubscription = null;
global.frontSubscription = null;

module.exports = app;