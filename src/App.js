import React, { useState, useEffect } from 'react'
import Web3 from "web3"
import {NotificationContainer, NotificationManager} from 'react-notifications'
import WalletConnectProvider from "@walletconnect/web3-provider"
import { TailSpin } from 'react-loader-spinner'
import Modal from 'react-responsive-modal'
import { TOKEN_ADDRESS, STAKING_CONTRACT_ADDRESS } from './constants/constant'
import { TOKEN_ABI, STAKING_CONTRACT_ABI } from './constants/abi'
import Logo from './icon/logo.svg'
import connectIcon from './icon/connect.png'
import rank from './icon/rank.png'
import rank2 from './icon/rank2.png'
import rank3 from './icon/rank3.png'
import metaMaskIcon from "./icon/metamask-icon.png"
import walletConnectIcon from "./icon/walletconnect-icon.png"
import './App.css'
import 'react-responsive-modal/styles.css'
import 'react-notifications/lib/notifications.css'

const CHAIN_ID = '0x61'

const chainConfig = {
  CHAIN_ID,
  chainName: 'BSC Testnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  },
  rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
  blockExplorerUrls: ['https://testnet.bscscan.com']
}
/* global BigInt */

// let WC = new WalletConnect({ 
//   infuraId: 'e865674e82ea42d18b4ecda5279265ac',
//   bridge: "https://bridge.walletconnect.org",
//   qrcodeModal: QRCodeModal 
// })

const provider = new WalletConnectProvider({
  infuraId: "e865674e82ea42d18b4ecda5279265ac", // Required
  // bridge: "https://bridge.myhostedserver.com",
  // qrcode: true,
  rpc: {
      97: "https://data-seed-prebsc-1-s1.binance.org:8545/"
  },
})

export default function App() {
  // console.log(process.env.REACT_APP_RPC_URL_WSS)
  const decimal = 10 ** 18
  let tokenContract = null
  let stakeContract = null
  let web3 = window.ethereum ? new Web3(window.ethereum) : new Web3(provider)
  console.log(web3)
  
  tokenContract = new web3.eth.Contract(TOKEN_ABI, TOKEN_ADDRESS)
  stakeContract = new web3.eth.Contract(STAKING_CONTRACT_ABI, STAKING_CONTRACT_ADDRESS)

  const [open, setOpen] = useState(false)
  const [openDisconnect, setOpenDisconnect] = useState(false)
  const [chainId, setChainId] = useState('')
  const [wallet, setWallet] = useState('CONNECT WALLET')
  const [connector, setConnector] = useState(null)
  const [mode, setMode] = useState(-1)
  const [stakerMode, setStakerMode] = useState(-1)
  const [period, setPeriod] = useState(0)
  const [rewardRate, setRewardRate] = useState(0)
  const [unstakeFee, setUnStakeFee] = useState(0)
  const [stakeAmount, setStakeAmount] = useState(0.0)
  const [withdrawAmount, setWithDrawAmount] = useState(0.0)
  const [stakers, setStakers] = useState(0)
  const [stakeUsdAmout, setStakeUsdAmount] = useState(0)
  const [stakeTokenAmount, setStakeTokenAmount] = useState(0)
  const [usdBalance, setUsdBalance] = useState(0)
  const [balance, setBalance] = useState(0)
  const [stakedUsdAmount, setStakedUsdAmount] = useState(0)
  const [stakedAmount, setStakedAmount] = useState(0)
  const [rewardAmount, setRewardAmount] = useState(0)
  const [timerId, setTimerId] = useState(null)
  const [leftTime, setLeftTime] = useState(0)
  const [loading, setLoading] = useState(false)

  const disconnectWallet = () => {
    setOpenDisconnect(false)
    localStorage.clear()
    setWallet('CONNECT WALLET')
    setBalance(0)
    setStakedAmount(0)
    setRewardAmount(0)
    setStakeAmount(0)
    setWithDrawAmount(0)
    setLeftTime(0)
    setStakerMode(-1)
    setChainId('')
    setStakeTokenAmount(0)
    setStakers(0)
    setRewardRate(0)
    setUnStakeFee(0)
    setPeriod(0)
    setMode(-1)

    if (connector && connector.connected) {
      connector.killSession();
      setConnector(null)
    }
  }

  const connectMetamask = async () => {
    setOpen(false)
    if(window.ethereum) {
      await window.ethereum.request({ method: "eth_requestAccounts" })
        .then(async (accounts) => {
          
          let chainId = window.ethereum.chainId // 0x1 Ethereum, 0x2 testnet, 0x89 Polygon, etc.
          setWallet(accounts[0])
          localStorage.setItem('wallet', accounts[0])
          
          if(chainId !== CHAIN_ID) {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: Web3.utils.toHex(CHAIN_ID) }],
            }).then((res) => { setChainId(CHAIN_ID) }).catch(err => console.log(err))
          } else setChainId(CHAIN_ID)

        }).catch(async (err) => {
          if (err.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [chainConfig]
            })
            setChainId(CHAIN_ID)
          }
        })
    } else NotificationManager.error('Metamask is not installed', 'Error', 3000)
  }

  const walletConnect = async () => {
    try {  
      setOpen(false)
      await provider.enable()
    } catch (error) {
      console.log(error)
    }
  }

  const getStakeState = async () => {
    if(!stakeContract) return
    // setLoading(true)
    const res1 = await Promise.all([
      stakeContract.methods.getNumberofStakers().call(),
      stakeContract.methods.getTotalStakedAmount().call(),
      stakeContract.methods.isStartStaking(wallet).call(),
      tokenContract.methods.balanceOf(wallet).call(),
    ])
    setLoading(false)
    setStakers(Number(res1[0]))
    setStakeTokenAmount(Math.round(Number(res1[1] * 100) / (decimal * 100)))
    setBalance(Math.round(Number(res1[3] * 100) / (decimal * 100)))

    if(res1[2]) {
      // setLoading(true)
      const result = await Promise.all([
        stakeContract.methods.getStakedAmount(wallet).call(),
        stakeContract.methods.getRewardAmount(wallet).call(),
        stakeContract.methods.getStakerMode(wallet).call()
      ])
      setLoading(false)
      setStakedAmount(Math.round(Number(result[0] * 100) / (decimal * 100)))
      setRewardAmount(Math.round(Number(result[1] * 100) / (decimal * 100)))
      setStakerMode(result[2])
    }
  }

  const getRateAndFee = async () => {
    if((!localStorage.getItem('wallet') && !localStorage.getItem('walletconnect')) || mode === -1) return
    // setLoading(true)
    const result = await Promise.all([
      stakeContract.methods.getRewardRate(mode).call(),
      stakeContract.methods.getWithdrawFee(mode, false).call(),
    ])
    setLoading(false)
    setRewardRate(Number(result[0]) / 100)
    setUnStakeFee(Number(result[1]) / 100)
    setPeriod(mode === 0 ? 30 : mode * 90)
  }

  const stake = async () => {
    if(wallet !== 'CONNECT WALLET') {
      if(stakeAmount <= 0) {
        NotificationManager.error('Stake Amount should be more than zero', 'Error', 3000)
        return
      } else if(stakeAmount > balance) {
        NotificationManager.error('Token balance is Insufficient', 'Error', 3000)
        return
      } else if(mode !== stakerMode && stakerMode !== -1) {
        NotificationManager.info('You already started staking', 'Info', 3000)
        return
      }
      setLoading(true)
      await tokenContract.methods.approve(STAKING_CONTRACT_ADDRESS, BigInt(stakeAmount * decimal)).send({ from: wallet })
      await stakeContract.methods.startStaking(BigInt(stakeAmount * decimal), mode).send({ from: wallet })
      setLoading(false)
      setStakeAmount(0)
      getLeftTime()
      getStakeState()
    } else NotificationManager.error('Please connect wallet', 'Error', 3000)
  }

  const getLeftTime = async () => {
    if(wallet === 'CONNECT WALLET') return
    const time = await stakeContract.methods.getLeftStakeTime(wallet).call()
    if(timerId) clearInterval(timerId)
    setLeftTime(time)
  }

  const withdraw = async () => {
    if(wallet !== 'CONNECT WALLET') {
      if(withdrawAmount <= 0) {
        NotificationManager.error('Withdraw Amount should be more than zero', 'Error', 3000)
        return
      } else if(withdrawAmount >= stakedAmount) {
        NotificationManager.error("staked Amount is Insufficient", 'Error', 3000)
        return
      }
      setLoading(true)
      await stakeContract.methods.withdraw(BigInt(withdrawAmount * decimal)).send({ from: wallet })
      setLoading(false)
      setWithDrawAmount(0)
      getStakeState()
    } else NotificationManager.error('Please connect wallet', 'Error', 3000)
  }

  const harvest = async () => {
    if(wallet !== 'CONNECT WALLET') {
      if(rewardAmount <= 0) {
        NotificationManager.error('No reward', 'Error', 3000)
        return
      }
      setLoading(true)
      await stakeContract.methods.harvest().send({ from: wallet })
      setLoading(false)
      getStakeState()
    } else NotificationManager.error('Please connect wallet', 'Error', 3000)
  }

  useEffect(() => { 
    if(chainId === CHAIN_ID && wallet !== 'CONNECT WALLET') {
      getStakeState() 
      getLeftTime()
      setMode(0)
    }
  }, [chainId])
  useEffect(() => { getRateAndFee() }, [mode])
  useEffect(() => {
    if(leftTime > 0) {
      if(timerId === null) {
        let id = setInterval(() => {
          if(leftTime > 0) setLeftTime(time => time - 1)
        }, 1000)
        setTimerId(id)
      }
    } else {
      if(timerId) {
        clearInterval(timerId)
        setTimerId(null)
      }
    }
  }, [leftTime])
  useEffect(() => {
    if(localStorage.getItem('wallet')) setWallet(localStorage.getItem('wallet'))
    if(localStorage.getItem('walletconnect')) setWallet(JSON.parse(localStorage.getItem('walletconnect')).accounts[0])
    if(window.ethereum) {
      window.ethereum.on('accountsChanged', async () => {
        const accounts = await window.ethereum.request({method: 'eth_accounts'});
        if (!(accounts && accounts.length > 0)) disconnectWallet()
      })
    }
  }, [])
  useEffect(() => {
    if(wallet !== 'CONNECT WALLET') {
      getStakeState()
      getLeftTime()
      setMode(0)
    }
  }, [wallet])
  useEffect(() => {
    provider.on("accountsChanged", (accounts) => {
      console.log(accounts)
    });
    // if (connector) {
    //   connector.on("session_update", (error, payload) => {
    //     console.log(payload)
    //   })

    //   connector.on("connect", (error, payload) => {
    //     const { chainId, accounts } = connector;
    //     setChainId('0x' + chainId.toString(16))
    //     setWallet(accounts[0])
    //   })

    //   connector.on("disconnect", (error, payload) => {
    //     disconnectWallet()
    //   })

    //   if (connector.connected) {
    //     const { chainId, accounts } = connector;
    //     setChainId('0x' + chainId.toString(16))
    //     setWallet(accounts[0])
    //   }
    // }
  }, [connector])

  const closeIcon = (
    <svg
      width={"24"}
      height={"24"}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ cursor: "pointer" }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.2328 18.4688C17.5746 18.8105 18.1286 18.8105 18.4703 18.4688C18.812 18.1271 18.812 17.573 18.4703 17.2313L13.6886 12.4497L18.4695 7.66877C18.8112 7.32706 18.8112 6.77304 18.4695 6.43133C18.1278 6.08962 17.5738 6.08962 17.2321 6.43133L12.4512 11.2122L7.67028 6.43133C7.32857 6.08962 6.77455 6.08962 6.43284 6.43133C6.09114 6.77304 6.09114 7.32706 6.43284 7.66877L11.2137 12.4497L6.43206 17.2313C6.09036 17.573 6.09036 18.1271 6.43206 18.4688C6.77377 18.8105 7.32779 18.8105 7.6695 18.4688L12.4512 13.6871L17.2328 18.4688Z"
        fill={"white"}
      />
    </svg>
  )

  const ButtonGroup = ({ buttons, method, setMethod  }) => {
    const handleClick = (event, id) => { setMethod(id) }
    return (
      <>
        {buttons.map((buttonLabel, i) => (
          <button
            key={i}
            name={buttonLabel}
            onClick={(event) => handleClick(event, i)}
            className={i === method ? "customButton active" : "customButton"}
          >
            {buttonLabel}
          </button>
        ))}
      </>
    );
  };
  
  return (
    <>
    <NotificationContainer/>
      {loading &&
        <div className="loading">
          <div className="load">
            <TailSpin
              height="100"
              width="100"
              color="rgb(203, 68, 214)"
              ariaLabel="tail-spin-loading"
              radius="2"
              wrapperStyle={{}}
              wrapperClass=""
              visible={true}
            />
          </div>
      </div>
      }
      <Modal open={open} onClose={() => setOpen(false)} center classNames={{overlay: 'overlay', modal: 'modal'}} animationDuration={500}  closeIcon={closeIcon}>
        <h2>Connect Wallet</h2>
        <div className="wallet" onClick={connectMetamask}>
          <span>MetaMask</span><div style={{ width: '50px', textAlign: 'center'}}><img src={metaMaskIcon} alt="metamask" width={25} height={25}/></div>
        </div>
        <div className="wallet" onClick={walletConnect}>
          <span>WalletConnect</span><div style={{ width: '50px', textAlign: 'center'}}><img src={walletConnectIcon} alt="walletConnect" width={40} height={25}/></div>
        </div>
      </Modal>
      <Modal open={openDisconnect} onClose={() => setOpenDisconnect(false)} center classNames={{overlay: 'overlay', modal: 'modal'}} animationDuration={500}  closeIcon={closeIcon}>
        <h2>Disconnect Wallet</h2>
        <div className="wallet" onClick={disconnectWallet}>
          <span>Disconnect {wallet.substring(0, 9).toUpperCase()}...{wallet.substring(-1, 4).toUpperCase()}</span>
        </div>
        
      </Modal>
      <div className="app">
        <div className="header">
          <div>
            <img className="logo" src={Logo} alt="logo" />
          </div>
          <div className="top-buttons">
            {/* <button className="buy-token-button">
              <span>BUY TOKEN</span>
            </button> */}
            <button className="connect-button" onClick={() => { 
              if(wallet === 'CONNECT WALLET') setOpen(true)
              else setOpenDisconnect(true)
            }}>
              <img src={connectIcon} alt="connect-icon"/>
              <span style={{ marginLeft: '8px' }}>{wallet === 'CONNECT WALLET' ? wallet : `${wallet.substring(0, 9).toUpperCase()}...${wallet.substring(-1, 4).toUpperCase()}`}</span>
            </button>
          </div>
        </div>
        <div className="title">
          Staking SALACA
        </div>
        <div className="container">
            <div className="stacking-info-card clock" id="mobile-clock">
              {leftTime > 24 * 3600 && <><span style={{ fontSize: '25px' }}>{Math.floor(leftTime / (24 * 3600)) < 10 ? '0' : ''}{Math.floor(leftTime / (24 * 3600))}</span>&nbsp;days&nbsp;</>}
              {Math.floor(leftTime % (24 * 3600) / 3600) > 0 && <><span style={{ fontSize: '25px' }}>{Math.floor(leftTime % (24 *3600) / 3600) < 10 ? '0' : ''}{Math.floor(leftTime % (24 *3600) / 3600)}</span>&nbsp;hrs&nbsp;</>}
              {Math.floor((leftTime % (24 * 3600) % 3600) / 60) > 0 && <><span style={{ fontSize: '25px' }}>{Math.floor((leftTime % (24 * 3600) % 3600) / 60) < 10 ? '0' : ''}{Math.floor((leftTime % (24 * 3600) % 3600) / 60)}</span>&nbsp;mins&nbsp;</>}
              <><span style={{ fontSize: '25px' }}>{((((leftTime % (24 * 3600) % 3600) % 60) < 10) && Number(leftTime) !== 0) ? '0' : ''}{(leftTime % (24 * 3600) % 3600) % 60}</span>&nbsp;secs</>
            </div>
          <div className="stacking">
            <h1>STAKING</h1>
            <br/><br/>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ButtonGroup
                buttons={["1 month", "3 month", "6 month"]}
                method={mode}
                setMethod={setMode}
              />
            </div>
            <div className="reward">
              <div>
                <h3 style={{ marginBottom: '8px' }}>Lock period: first {period} days</h3>
                <h3 style={{ marginBottom: '8px' }}>Early unstake fee: {unstakeFee}%</h3>
                <h3 style={{ marginBottom: '8px' }}>Status: {leftTime > 0 ? 'Locked' : 'UnLocked' }</h3>
                {/* <h3 style={{ marginBottom: '8px' }}>Minimum Staking Amount: 3000000</h3> */}
              </div>
              <div>
                <h3 style={{ textAlign: 'right', marginBottom: '8px' }}>Reward Rate</h3>
                <h1 style={{ textAlign: 'right', marginBottom: '8px', color: '#a3ff12' }}>{rewardRate}%</h1>
                <h3 style={{ textAlign: 'right', marginBottom: '8px' }}>Reward Per Day</h3>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <h2>Balance: {balance} SALACA ( 0 $ )</h2>
              <div className="input-button">
                <div>
                  <input value={stakeAmount} onChange={(e) => { setStakeAmount(e.target.value) }} className="input-style" />
                </div>
                <div>
                  <button className="style-button" onClick={stake}>STAKE</button>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <h2>Staked: {stakedAmount} SALACA ( 0 $ )</h2>
              <div className="input-button">
                <div>
                  <input value={withdrawAmount} onChange={(e) => { setWithDrawAmount(e.target.value) }} className="input-style"/>
                </div>
                <div>
                  <button className="style-button" onClick={withdraw}>WITHDRAW</button>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <h2>Reward:</h2>
              <div className="input-button">
                <div>
                  <h2>{rewardAmount} SALACA</h2>
                </div>
                <div>
                  <button className="style-button" onClick={harvest}>HARVEST</button>
                </div>
              </div>
            </div>
          </div>
          <div className="stacking-info">
            <div className="stacking-info-card clock" id="desktop-clock">
              {leftTime > 24 * 3600 && <><span style={{ fontSize: '35px' }}>{Math.floor(leftTime / (24 * 3600)) < 10 ? '0' : ''}{Math.floor(leftTime / (24 * 3600))}</span>&nbsp;days&nbsp;</>}
              {Math.floor(leftTime % (24 * 3600) / 3600) > 0 && <><span style={{ fontSize: '35px' }}>{Math.floor(leftTime % (24 *3600) / 3600) < 10 ? '0' : ''}{Math.floor(leftTime % (24 *3600) / 3600)}</span>&nbsp;hrs&nbsp;</>}
              {Math.floor((leftTime % (24 * 3600) % 3600) / 60) > 0 && <><span style={{ fontSize: '35px' }}>{Math.floor((leftTime % (24 * 3600) % 3600) / 60) < 10 ? '0' : ''}{Math.floor((leftTime % (24 * 3600) % 3600) / 60)}</span>&nbsp;mins&nbsp;</>}
              <><span style={{ fontSize: '35px' }}>{((((leftTime % (24 * 3600) % 3600) % 60) < 10) && Number(leftTime) !== 0) ? '0' : ''}{(leftTime % (24 * 3600) % 3600) % 60}</span>&nbsp;secs</>
            </div>
            <div className="stacking-info-card">
              <div className="info">
                <div className="number">0</div>
                <div className="currency">$</div>
                <div className="description">Total Staked</div>
              </div>
              <div className="diagram">
                <img src={rank} alt="rank"/>
              </div>
            </div>
            <div className="stacking-info-card">
              <div className="info">
                <div className="number">{stakeTokenAmount}</div>
                <div className="currency">SALACA</div>
                <div className="description">Total Staked</div>
              </div>
              <div className="diagram">
                <img src={rank2} alt="rank2"/>
              </div>
            </div>
            <div className="stacking-info-card">
              <div className="info">
                <div className="number">{stakers}</div>
                <div className="currency"></div>
                <div className="description">Number of Stakers</div>
              </div>
              <div className="diagram">
                <img src={rank3} alt="rank3"/>
              </div>
            </div>
            <div className="stacking-info-card">
              <div className='history'>
                  <table className="history-data">
                    <thead>
                      <tr>
                        <th>Addresss</th>
                        <th>Amount</th>
                        <th>Ago</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>0xe1ce...269a</td>
                        <td>555 SALACA</td>
                        <td>25 mins</td>
                      </tr>
                      <tr>
                        <td>0x10D1...8570</td>
                        <td>555 SALACA</td>
                        <td>25 mins</td>
                      </tr>
                      <tr>
                        <td>0x9Dbe...0119</td>
                        <td>555 SALACA</td>
                        <td>25 mins</td>
                      </tr>
                    </tbody>
                  </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}