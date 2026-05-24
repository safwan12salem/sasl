import { ethers } from 'ethers';

// Polygon Mumbai testnet (FREE)
const POLYGON_MUMBAI = {
  chainId: 80001,
  rpcUrl: 'https://rpc-mumbai.maticvigil.com',
};

// Simple badge contract ABI
const BADGE_ABI = [
  'function mintBadge(address to, string memory tokenURI) public returns (uint256)',
];

const BADGE_CONTRACT = '0x0000000000000000000000000000000000000000'; // Deploy your own

export async function awardNFTBadge(userAddress: string, badgeName: string, description: string) {
  try {
    // For now, store badge data locally (free)
    const badge = {
      name: badgeName,
      description: description,
      earnedAt: new Date().toISOString(),
      image: `https://via.placeholder.com/200/00A86B/FFFFFF?text=${badgeName.replace(/\s/g, '+')}`,
    };

    // Save to user's local storage as proof of concept
    const badges = JSON.parse(localStorage.getItem('sasl_nft_badges') || '[]');
    badges.push(badge);
    localStorage.setItem('sasl_nft_badges', JSON.stringify(badges));

    return badge;
  } catch (err) {
    console.warn('NFT badge creation failed:', err);
    return null;
  }
}

export function getUserBadges(): any[] {
  return JSON.parse(localStorage.getItem('sasl_nft_badges') || '[]');
}