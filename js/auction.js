import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm';

const AUCTION_CONTRACT = '0x10AAfa66f2E2a058Fb6f875867b6d0c6fc93E5f8';
const ABI = [
  'function getAuction(uint256 auctionId) external view returns (uint256 tokenId, address seller, uint256 startTime, uint256 endTime, uint256 minBid, uint256 highestBid, address highestBidder, uint8 status)',
  'function getTimeRemaining(uint256 auctionId) external view returns (uint256)'
];

const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
const contract = new ethers.Contract(AUCTION_CONTRACT, ABI, provider);

const STATUS_MAP = { 0: 'pending', 1: 'live', 2: 'ended', 3: 'cancelled' };

function formatTime(seconds) {
  const s = Number(seconds);
  if (s <= 0) return 'Ended';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return h + 'h ' + m + 'm left';
  return m + 'm left';
}

function formatEth(wei) {
  const eth = ethers.formatEther(wei);
  const num = parseFloat(eth);
  if (num === 0) return null;
  return num % 1 === 0 ? num.toFixed(1) : parseFloat(num.toFixed(4)).toString();
}

async function updateLotCard(auctionId) {
  try {
    const [auction, timeRemaining] = await Promise.all([
      contract.getAuction(auctionId),
      contract.getTimeRemaining(auctionId)
    ]);

    const card = document.querySelector('[data-auction-id="' + auctionId + '"]');
    if (!card) return;

    const status = STATUS_MAP[Number(auction.status)] || 'pending';
    const highestBid = formatEth(auction.highestBid);
    const badge = card.querySelector('.lot-badge');
    const bidEl = card.querySelector('.lot-bid');
    const linkEl = card.querySelector('.lot-bid-link');

    if (badge) {
      badge.className = 'lot-badge lot-badge--' + status;
      badge.textContent = status === 'live' ? 'Live' : status === 'ended' ? 'Ended' : status === 'cancelled' ? 'Cancelled' : 'Pending';
    }

    if (bidEl && linkEl) {
      if (status === 'live') {
        bidEl.textContent = highestBid ? 'Current bid ' + highestBid + ' ETH' : '';
        linkEl.textContent = highestBid ? formatTime(timeRemaining) : '';
      } else if (status === 'ended') {
        bidEl.textContent = highestBid ? 'Sold for ' + highestBid + ' ETH' : '';
        linkEl.textContent = highestBid ? 'Auction ended' : '';
      } else if (status === 'pending') {
        bidEl.textContent = 'Reserve not met';
        linkEl.textContent = '';
      } else {
        bidEl.textContent = '';
        linkEl.textContent = '';
      }
    }
  } catch (e) {
    console.warn('Auction ' + auctionId + ' fetch failed:', e.message);
  }
}

async function updateAllLots() {
  await Promise.all([1, 2, 3, 4, 5, 6].map(id => updateLotCard(id)));
}

updateAllLots();
setInterval(updateAllLots, 60000);
