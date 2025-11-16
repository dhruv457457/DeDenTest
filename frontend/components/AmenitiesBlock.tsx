import { useState } from "react";
import { Check } from "lucide-react";

export function AmenitiesBlock({
  title,
  items,
  isHighlight = false,
}: {
  title: string;
  items: string[];
  isHighlight?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const visibleItems = expanded ? items : items.slice(0, 5);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border-2 border-white/10 hover:border-white/20 transition-all">
      <h3 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
        {title}
      </h3>

      <div className="space-y-4">
        {visibleItems.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 text-white bg-white/5 p-4 rounded-xl hover:bg-white/10 transition-all"
          >
            {!isHighlight && (
              <div className="w-6 h-6 rounded-full bg-[#F5F5F3] flex items-center justify-center flex-shrink-0 mt-1">
                <Check size={16} className="text-[#172a46]" />
              </div>
            )}

            <span className="font-inter text-lg text-gray-100">{item}</span>
          </div>
        ))}
      </div>

      {/* View More / View Less */}
      {items.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-6 w-full text-center py-3 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-all text-white font-semibold"
        >
          {expanded ? "View Less" : `View More (${items.length - 5} more)`}
        </button>
      )}
    </div>
  );
}
