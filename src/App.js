// import logo from './logo.svg';
import './App.css';

import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import { useState, useEffect } from 'react';
import { NotificationManager } from "react-notifications";
import { NotificationContainer } from 'react-notifications';
import 'react-notifications/lib/notifications.css';
import logo from './images.png';
import CONFIG from './config';
import { isAddress } from 'web3-validator';

function App() {
  
  const [address, setAddress] = useState("");
  const [tokenaddress, setTokenAddress] = useState("");
  const [slippage, setSlippage] = useState("");
  const [gasprice, setGasPrice] = useState("");
  const [gaslimit, setGasLimit] = useState("");

  const [swapStarted, setSwapStarted] = useState(false);

  useEffect(()=>{
  },[address, slippage, gasprice, gaslimit])

  const checkValidate = () => {
    if( address === "" ||
        tokenaddress === "" ||
        slippage === "" ||
        gasprice === "" ||
        gaslimit === "" ) {
         NotificationManager.error("Invalid params, input all blanks correctly!");
         return false;
        }

    if (isAddress(address) === false) {
      NotificationManager.error("Invalid wallet address.");
      return false;
    }

    if (isAddress(tokenaddress) === false) {
      NotificationManager.error("Invalid token address.");
      return false;
    }

    if (parseInt(slippage, 10) < 10 || parseInt(slippage, 10) > 50){
      NotificationManager.error("Invalid slippage.");
      return false;
    }

    if (parseInt(gasprice, 10) < 3 || parseInt(gasprice, 10) >= 10){
      NotificationManager.error("Invalid gasprice.");
      return false;
    }

    if (parseInt(gaslimit, 10) < 300000 || parseInt(gaslimit, 500000) > 90){
      NotificationManager.error("Invalid gaslimit.");
      return false;
    }

    return true;
  }

  const swapStartBtnClicked =  (event) => {
    if (checkValidate() === false){
      return;
    }

    if(swapStarted) { 
      setSwapStarted(false);
      fetch(CONFIG.BACKEND_URL + "/swapstop", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
      }).then((response) => {
        console.log("Response : " + response);
        NotificationManager.info("Response : " + response.value);
      }).catch((err) => {
        console.log("error", err);
        NotificationManager.err("Error : " + err);
      })
    }
    else{
      setSwapStarted(true);
      let data ={
        address: address,
        tokenaddress: tokenaddress,
        slippage: slippage,
        gasprice: gasprice,
        gaslimit: gaslimit
      }
      
      fetch(CONFIG.BACKEND_URL + "/swapstart", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then((response) => {
        NotificationManager.info("Response : " + response.value);
        console.log("Response : " + response.value);
      }).catch((err) => {
        console.log("error", err);
        NotificationManager.err("Error : " + err);
      })
    }

  
    }

  // Initial
  const addressChanged = (event) =>{
    setAddress(event.target.value);
  }

  const tokenAddressChanged = (event) =>{
    setTokenAddress(event.target.value);
  }
  

  const slippageChanged = (event) =>{
    setSlippage(event.target.value);
  }
  const gaspriceChanged = (event) =>{
    setGasPrice(event.target.value);
  }
  const gaslimitChanged = (event) =>{
    setGasLimit(event.target.value);
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <div className="Overall">
        <Divider sx={{ color: "black" }}>Swap Information</Divider>
          <div className="initialSettingDiv">
              <div className="initalItemDiv">
                <TextField
                  required
                  id="outlined-required"
                  label="Wallet Address"
                  sx={{ width: 450}}
                  onChange={addressChanged}
                />
              </div>
              <div className="initalItemDiv">
                <TextField
                  required
                  id="outlined-required"
                  label="Token Address"
                  sx={{ width: 450}}
                  onChange={tokenAddressChanged}
                />
              </div>
              <div  className="initalItemDiv">
                <TextField
                  required
                  id="outlined-required"
                  label="Slippage(%)"
                  sx={{ width: 150}}
                  type="number"
                  onChange={slippageChanged}
                />

                <TextField
                  required
                  id="outlined-required"
                  label="Gas Price"
                  type="number"
                  sx={{ width: 150}}
                  onChange={gaspriceChanged}
                />
             
                <TextField
                  required
                  id="outlined-required"
                  label="Gas Limit"
                  type="number"
                  sx={{ width: 150}}
                  onChange={gaslimitChanged}
                />
              </div>
          </div>
          <Divider sx={{ color: "black" }}></Divider>
          
          <div className="btnDiv">
            <Button variant="contained" onClick={swapStartBtnClicked}>{swapStarted?"Stop Swap":"Start Swap"}</Button>
          </div>

          <div className="footer"></div>
        </div>

      </header>
      <NotificationContainer />
    </div>
  );
}

export default App;
