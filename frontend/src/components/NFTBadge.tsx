export default function NFTBadge({ badge }: { badge: any }) {
  return (
    <div className="relative group">
      <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 p-[2px]">
        <img src={badge.image} className="w-full h-full rounded-xl object-cover" />
      </div>
      {badge.verified && (
        <span className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">✓</span>
      )}
      <p className="text-[10px] text-center mt-1 font-semibold">{badge.name}</p>
    </div>
  );
}