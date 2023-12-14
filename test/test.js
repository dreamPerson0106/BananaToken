const { expect , assert } = require("chai");
const { ethers, network } = require("hardhat");
require('dotenv').config();


describe("Start Audit!", async function () {
  let BananaToken, UniswapV2Router;
  let marketingWallet = "0xfbe02de299fC5faeEF687d2af7EE4C0E5f620FF2";
  
  it("checkDeployedToken", async function () {
    [deployer] = await ethers.getSigners();
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.RPC_URL,
          },
        },
      ],
    });
  
    const BananaToken_deploy = await ethers.getContractFactory("MonieBot");
    const BananaToken_deployed = await BananaToken_deploy.deploy();
    BananaToken = await BananaToken_deployed.deployed();
    
    const _UniswapV2Router = await ethers.getContractFactory("UniswapV2Router02");
    UniswapV2Router = _UniswapV2Router.attach("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");

    let signers = await ethers.getSigners();
    for (let i = 0; i < signers.length; i++) {
      await BananaToken.connect(signers[i]).approve(
        UniswapV2Router.address,
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      );
    }

    try {
      const tx = await UniswapV2Router.connect(deployer).addLiquidityETH(
        BananaToken.address,
        ethers.utils.parseUnits("500000", 9),
        0,
        0,
        deployer.address,
        Date.now() + 1000 * 60 * 5,
        { value: ethers.utils.parseEther("1") }
      );
      console.log("AddLiquidity Success");
    } catch (err) {
      console.log("AddLiquidity Failed", err);
    }

    await BananaToken.connect(deployer).enableTrading();
    console.log("OpenTrade success");
    for(let i = 1; i < 10 ; ++ i) {
      await UniswapV2Router.connect(signers[i]).swapETHForExactTokens(
        ethers.utils.parseUnits("5000", 9),
        ["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", BananaToken.address],
        signers[i].address,
        Date.now() + 1000 * 60 * 5,
        { value: ethers.utils.parseEther("1") }
      );
    }

    // Check current balance of wallets
    for(let i = 1 ; i < 10 ;++ i) {
      expect(await BananaToken.balanceOf(signers[i].address)).equal(ethers.utils.parseUnits("2500", 9));
    }
    console.log("Buy token with 10 wallets success");

    // Check current balance of smart contract: 36000 < 40000 so normal swap back will happen
    expect(await BananaToken.balanceOf(BananaToken.address)).equal(ethers.utils.parseUnits("22500", 9))
    console.log("Token balance checked")

    const balanceOfMarketWalletBeforeSell = await ethers.provider.getBalance(marketingWallet);
    // Sell token
    await UniswapV2Router.connect(signers[1]).swapExactTokensForETHSupportingFeeOnTransferTokens(
      ethers.utils.parseUnits("2500", 9),
      0,
      [BananaToken.address, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"],
      signers[1].address,
      Date.now() + 1000 * 60 * 5
    );

    console.log("Sell token with first wallet success");
    // Check current balance of singer1 wallet
    expect(await BananaToken.balanceOf(signers[1].address)).equal(ethers.utils.parseEther("0"));

    // Check current balance of smart contract : sumOfBuyFee - swapBackAmount + sellFee
    expect(await BananaToken.balanceOf(BananaToken.address)).equal((ethers.utils.parseUnits("22500", 9)).sub(ethers.utils.parseUnits("2000", 9)).add(ethers.utils.parseUnits("1250", 9)))
      
    console.log("Fee receive on MarketWallet");
    console.log(ethers.utils.formatEther((await ethers.provider.getBalance(marketingWallet)).sub(balanceOfMarketWalletBeforeSell)));

    // Check current balance of smart contract
    expect(await ethers.provider.getBalance(BananaToken.address)).equal(ethers.utils.parseEther("0"));
  });
});
