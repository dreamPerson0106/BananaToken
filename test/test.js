const { expect , assert } = require("chai");
const { ethers, network } = require("hardhat");
require('dotenv').config();


describe("Start Audit!", async function () {
  let BananaToken, UniswapV2Router;
  let revWallet = "0x9ef0F6F745B79949BBdDE900013FCA359bcFd59A";
  let treasuryWallet = "0x7d35f092baD40CBAEEC9Ea518C2DAa3335076E8f";
  let teamWallet = "0x37aAb97476bA8dC785476611006fD5dDA4eed66B";
  
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
  
    const BananaToken_deploy = await ethers.getContractFactory("Banana");
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
    
    // try {
    //   const tx = await UniswapV2Router.connect(deployer).addLiquidityETH(
    //     BananaToken.address,
    //     ethers.utils.parseEther("8880000"),
    //     0,
    //     0,
    //     teamWallet,
    //     Date.now() + 1000 * 60 * 5,
    //     { value: ethers.utils.parseEther("1") }
    //   );
    //   console.log("AddLiquidity Success");
    // } catch (err) {
    //   console.log("AddLiquidity Failed", err);
    // }

    await BananaToken.connect(deployer).transfer(BananaToken.address, ethers.utils,parseEther("8880000"));
    await BananaToken.connect(deployer).unleashTheBanana({value: ethers.utils.parseEther("1")});

    await BananaToken.connect(deployer).openTrade();
    console.log("OpenTrade success");
    for(let i = 1; i < 10 ; ++ i) {
      await UniswapV2Router.connect(signers[i]).swapETHForExactTokens(
        ethers.utils.parseEther("100000"),
        ["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", BananaToken.address],
        signers[i].address,
        Date.now() + 1000 * 60 * 5,
        { value: ethers.utils.parseEther("1") }
      );
    }

    console.log("Buy token with 10 wallets success");
    // Check current balance of wallets
    for(let i = 1 ; i < 10 ;++ i) {
      expect(await BananaToken.balanceOf(signers[i].address)).equal(ethers.utils.parseEther("96000"));
    }

    // Check current balance of smart contract: 36000 < 40000 so normal swap back will happen
    expect(await BananaToken.balanceOf(BananaToken.address)).equal(ethers.utils.parseEther("4000").mul(9))

    const balanceOfRevWalletBeforeSell = await ethers.provider.getBalance(revWallet);
    const balanceOfTeamWalletWalletBeforeSell = await ethers.provider.getBalance(teamWallet);
    const balanceOfTreasuryWalletWalletWalletBeforeSell = await ethers.provider.getBalance(treasuryWallet);
    // Sell token
    await UniswapV2Router.connect(signers[1]).swapExactTokensForETHSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("96000"),
      0,
      [BananaToken.address, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"],
      signers[1].address,
      Date.now() + 1000 * 60 * 5
    );

    console.log("Sell token with first wallet success");
    // Check current balance of singer1 wallet
    expect(await BananaToken.balanceOf(signers[1].address)).equal(ethers.utils.parseEther("0"));

    // Check current balance of smart contract : sumOfBuyFee - swapBackAmount + sellFee
    expect(await BananaToken.balanceOf(BananaToken.address)).equal((ethers.utils.parseEther("4000").mul(9)).sub(ethers.utils.parseEther("2000")).add(ethers.utils.parseEther("3840")))
      
    console.log("Fee receive on revWallet");
    console.log(ethers.utils.formatEther((await ethers.provider.getBalance(revWallet)).sub(balanceOfRevWalletBeforeSell)));
    console.log("Fee receive on teamWallet");
    console.log(ethers.utils.formatEther((await ethers.provider.getBalance(teamWallet)).sub(balanceOfTeamWalletWalletBeforeSell)));
    console.log("Fee receive on treasuryWallet");
    console.log(ethers.utils.formatEther((await ethers.provider.getBalance(treasuryWallet)).sub(balanceOfTreasuryWalletWalletWalletBeforeSell)));

    // Check current balance of smart contract
    expect(await ethers.provider.getBalance(BananaToken.address)).equal(ethers.utils.parseEther("0"));
  });
});
