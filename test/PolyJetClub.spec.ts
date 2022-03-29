// @ts-ignore
import {waffle} from 'hardhat'
import {expect} from 'chai'
import MockPolyJetClub from '../artifacts/contracts/mock/MockPolyJetClub.sol/MockPolyJetClub.json'
import MockWDC from '../artifacts/contracts/mock/MockWDC.sol/MockWDC.json'
import {BigNumber, Contract, utils} from 'ethers'
import {getSigMessage} from "./utils";

const {deployContract} = waffle
var black = '0x8888888888888888888888888888888888888888'

describe('PolyJetClub', async () => {
		const [alice, bob, dave] = waffle.provider.getWallets()

		let mockPolyJetClub: Contract
		let mockWDC: Contract
		beforeEach(async () => {
				mockPolyJetClub = await deployContract(alice, MockPolyJetClub, [])
				mockWDC = await deployContract(alice, MockWDC, [])

				await mockPolyJetClub.connect(alice).setWDC(mockWDC.address)
		})

		it('name, symbol', async () => {
				expect(await mockPolyJetClub.name()).eq("PolyJetClub")
				expect(await mockPolyJetClub.symbol()).eq("PolyJetClub")
		})

		it('claim', async () => {
				await expect(mockPolyJetClub.connect(bob).claim(0, 0)).revertedWith("Token ID invalid")
				await expect(mockPolyJetClub.connect(bob).claim(9001, 0)).revertedWith("Token ID invalid")
				await expect(mockPolyJetClub.connect(bob).claim(1, 0)).revertedWith("Insufficient handling fee")
				await expect(mockPolyJetClub.connect(bob).claim(1, 0, {value: utils.parseEther('4.9')})).revertedWith("Insufficient handling fee")
				await expect(mockPolyJetClub.connect(bob).claim(1, utils.parseEther('11999'))).revertedWith("ERC20: insufficient allowance")
				await expect(mockPolyJetClub.connect(bob).claim(1, utils.parseEther('12000'), {value: utils.parseEther('5')})).revertedWith("Abnormal fee")

				//psc
				var balance1 = await bob.getBalance()
				await mockPolyJetClub.connect(bob).claim(1, 0, {value: utils.parseEther('5')})
				var balance2 = await bob.getBalance()
				expect(balance2.sub(balance1).lt(utils.parseEther('5'))).eq(true)
				expect(await mockPolyJetClub.ownerOf(1)).eq(bob.address)
				expect(await mockPolyJetClub.tokenURI(1)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/1')
				expect(await mockPolyJetClub.total()).eq(1)
				expect(await mockPolyJetClub.getDate(1)).not.eq(0)
				expect(await mockPolyJetClub.getVit(1)).eq(100)

				//wdc
				await mockWDC.connect(alice).transfer(bob.address, BigNumber.from('100000000000000000'))
				await expect(mockPolyJetClub.connect(bob).claim(1, BigNumber.from('1199900000000'))).revertedWith("WDC insufficient handling fee")
				await expect(mockPolyJetClub.connect(bob).claim(1, BigNumber.from('1200000000000'))).revertedWith("ERC20: insufficient allowance")
				await mockWDC.connect(bob).approve(mockPolyJetClub.address, utils.parseEther('100000000'))
				await expect(mockPolyJetClub.connect(bob).claim(1, BigNumber.from('1200000000000'))).revertedWith("ERC721: token already minted")
				balance1 = await mockWDC.balanceOf(bob.address)
				await mockPolyJetClub.connect(bob).claim(2, BigNumber.from('1200000000000'))
				balance2 = await mockWDC.balanceOf(bob.address)
				expect(balance1.sub(balance2).eq(BigNumber.from('1200000000000'))).eq(true)
				expect((await mockWDC.balanceOf(black)).eq(BigNumber.from('1200000000000'))).eq(true)
				expect(await mockPolyJetClub.ownerOf(2)).eq(bob.address)
				expect(await mockPolyJetClub.tokenURI(2)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/2')
				expect(await mockPolyJetClub.total()).eq(2)
				expect(await mockPolyJetClub.getDate(2)).not.eq(0)
				expect(await mockPolyJetClub.getVit(2)).eq(100)
		})

		it('claimBatch', async () => {
				await expect(mockPolyJetClub.connect(bob).claimBatch([], 0)).revertedWith("Abnormal tokenIds length")
				await expect(mockPolyJetClub.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 0)).revertedWith("Abnormal tokenIds length")
				await expect(mockPolyJetClub.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0)).revertedWith("Insufficient handling fee")
				await expect(mockPolyJetClub.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], utils.parseEther('11999'))).revertedWith("ERC20: insufficient allowance")
				await expect(mockPolyJetClub.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0, {value: utils.parseEther('5')})).revertedWith("Insufficient handling fee")
				await expect(mockPolyJetClub.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 9001], 0, {value: utils.parseEther('50')})).revertedWith("Token ID invalid")
				await expect(mockPolyJetClub.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1000, {value: utils.parseEther('50')})).revertedWith("Abnormal fee")

				//psc
				await mockPolyJetClub.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0, {value: utils.parseEther('50')})
				expect(await mockPolyJetClub.ownerOf(1)).eq(bob.address)
				expect(await mockPolyJetClub.ownerOf(2)).eq(bob.address)
				expect(await mockPolyJetClub.ownerOf(3)).eq(bob.address)
				expect(await mockPolyJetClub.ownerOf(4)).eq(bob.address)
				expect(await mockPolyJetClub.ownerOf(5)).eq(bob.address)
				expect(await mockPolyJetClub.ownerOf(6)).eq(bob.address)
				expect(await mockPolyJetClub.ownerOf(7)).eq(bob.address)
				expect(await mockPolyJetClub.ownerOf(8)).eq(bob.address)
				expect(await mockPolyJetClub.ownerOf(9)).eq(bob.address)
				expect(await mockPolyJetClub.ownerOf(10)).eq(bob.address)
				expect(await mockPolyJetClub.total()).eq(10)
				expect(await mockPolyJetClub.tokenURI(1)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/1')
				expect(await mockPolyJetClub.tokenURI(9)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/9')
				expect(await mockPolyJetClub.tokenURI(10)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/10')

				//wdc
				await mockWDC.connect(alice).transfer(bob.address, BigNumber.from('100000000000000000'))
				await expect(mockPolyJetClub.connect(bob).claimBatch([11, 12, 13, 14], BigNumber.from('1200000000000'))).revertedWith("ERC20: insufficient allowance")
				await mockWDC.connect(bob).approve(mockPolyJetClub.address, utils.parseEther('100000000'))
				await expect(mockPolyJetClub.connect(bob).claimBatch([11, 12, 13, 14], BigNumber.from('1199900000000'))).revertedWith("Insufficient handling fee")
				await expect(mockPolyJetClub.connect(bob).claimBatch([10, 11, 12, 13, 14], BigNumber.from('1200000000000'))).revertedWith("ERC721: token already minted")
				await mockPolyJetClub.connect(bob).claimBatch([100, 11, 12, 13, 14, 15, 16, 17, 18, 19], BigNumber.from('12000000000000'))
				expect(await mockPolyJetClub.ownerOf(100)).eq(bob.address)
				expect(await mockPolyJetClub.ownerOf(11)).eq(bob.address)
				expect(await mockPolyJetClub.ownerOf(12)).eq(bob.address)
				expect(await mockPolyJetClub.ownerOf(13)).eq(bob.address)
				expect(await mockPolyJetClub.ownerOf(14)).eq(bob.address)
				expect(await mockPolyJetClub.ownerOf(15)).eq(bob.address)
				expect(await mockPolyJetClub.ownerOf(16)).eq(bob.address)
				expect(await mockPolyJetClub.ownerOf(17)).eq(bob.address)
				expect(await mockPolyJetClub.ownerOf(18)).eq(bob.address)
				expect(await mockPolyJetClub.ownerOf(19)).eq(bob.address)
				expect(await mockPolyJetClub.total()).eq(20)
				expect(await mockPolyJetClub.tokenURI(100)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/100')
				expect(await mockPolyJetClub.tokenURI(16)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/16')
				expect(await mockPolyJetClub.tokenURI(19)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/19')
		})

		it('claimPermit', async () => {
				await expect(mockPolyJetClub.connect(bob).claimPermit(100, 0x00)).revertedWith("Token ID invalid")
				await expect(mockPolyJetClub.connect(bob).claimPermit(9000, 0x00)).revertedWith("Token ID invalid")
				await expect(mockPolyJetClub.connect(bob).claimPermit(10001, 0x00)).revertedWith("Token ID invalid")
				await expect(mockPolyJetClub.connect(bob).claimPermit(9001, 0x00, {value: utils.parseEther('0.5')})).revertedWith("Insufficient handling fee")
				await expect(mockPolyJetClub.connect(bob).claimPermit(9001, 0x00)).revertedWith("ERC20: insufficient allowance")
				await mockWDC.connect(alice).transfer(bob.address, BigNumber.from('1000000000000000'))
				await mockWDC.connect(bob).approve(mockPolyJetClub.address, BigNumber.from('50000000'))
				await expect(mockPolyJetClub.connect(bob).claimPermit(9001, 0x00)).revertedWith("ERC20: insufficient allowance")
				await mockWDC.connect(bob).approve(mockPolyJetClub.address, utils.parseEther('1000000'))

				const chainId = (await waffle.provider.getNetwork()).chainId
				const sk = alice.privateKey.substring(2)
				const sk2 = dave.privateKey.substring(2)
				var message = getSigMessage(chainId, mockPolyJetClub.address, bob.address, 9001, sk2)
				await expect(mockPolyJetClub.connect(bob).claimPermit(9001, message, {value: utils.parseEther('1')})).revertedWith("Permit Failure")
				message = getSigMessage(chainId, mockPolyJetClub.address, bob.address, 10001, sk)
				await expect(mockPolyJetClub.connect(bob).claimPermit(9002, message, {value: utils.parseEther('1')})).revertedWith("Permit Failure")
				message = getSigMessage(chainId, mockPolyJetClub.address, bob.address, 9001, sk)
				//psc
				await mockPolyJetClub.connect(bob).claimPermit(9001, message, {value: utils.parseEther('1')})
				expect(await mockPolyJetClub.ownerOf(9001)).eq(bob.address)
				expect(await mockPolyJetClub.total()).eq(0)
				expect(await mockPolyJetClub.tokenURI(9001)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/9001')

				//wdc
				message = getSigMessage(chainId, mockPolyJetClub.address, bob.address, 9002, sk)
				var balance1 = await mockWDC.balanceOf(bob.address)
				await mockPolyJetClub.connect(bob).claimPermit(9002, message)
				var balance2 = await mockWDC.balanceOf(bob.address)
				expect(balance1.sub(balance2).eq(BigNumber.from('100000000'))).eq(true)
				expect(await mockPolyJetClub.ownerOf(9002)).eq(bob.address)
				expect(await mockPolyJetClub.total()).eq(0)
				expect(await mockPolyJetClub.tokenURI(9002)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/9002')

				//owner
				await mockPolyJetClub.connect(alice).claimPermit(9003, 0x00, {value: utils.parseEther('1')})
				expect(await mockPolyJetClub.ownerOf(9003)).eq(alice.address)
				expect(await mockPolyJetClub.total()).eq(0)
				expect(await mockPolyJetClub.tokenURI(9003)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/9003')

				await expect(mockPolyJetClub.connect(alice).claimPermit(9004, 0x00)).revertedWith("ERC20: insufficient allowance")
				await mockWDC.connect(alice).approve(mockPolyJetClub.address, utils.parseEther('1000000'))
				await mockPolyJetClub.connect(alice).claimPermit(9004, 0x00)
				expect(await mockPolyJetClub.ownerOf(9004)).eq(alice.address)
				expect(await mockPolyJetClub.total()).eq(0)
				expect(await mockPolyJetClub.tokenURI(9004)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/9004')
		})

		it('owner', async () => {
				await expect(mockPolyJetClub.tokenURI(1)).revertedWith("ERC721Metadata: URI query for nonexistent token")
				await expect(mockPolyJetClub.getVit(1)).revertedWith("ERC721Metadata: URI query for nonexistent token")
				expect(await mockPolyJetClub.change()).eq("0x0000000000000000000000000000000000000000")
				expect(await mockPolyJetClub.baseURI()).eq("ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/")

				await expect(mockPolyJetClub.connect(bob).setURI("ipfs://xxxx/")).revertedWith("Ownable: caller is not the owner")
				await mockPolyJetClub.connect(alice).setURI("ipfs://xxxx/")
				expect(await mockPolyJetClub.baseURI()).eq("ipfs://xxxx/")
				await mockPolyJetClub.connect(alice).claim(1, 0, {value: utils.parseEther('5')})
				expect(await mockPolyJetClub.ownerOf(1)).eq(alice.address)
				expect(await mockPolyJetClub.total()).eq(1)
				expect(await mockPolyJetClub.tokenURI(1)).eq('ipfs://xxxx/1')

				await expect(mockPolyJetClub.connect(bob).setChange(black)).revertedWith("Ownable: caller is not the owner")
				await mockPolyJetClub.connect(alice).setChange(black)
				expect(await mockPolyJetClub.change()).eq(black)
		})

})
