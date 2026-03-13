import { Users, ChevronRight } from "lucide-react";

interface CampusGroupProps {
  name: string;
  members: number;
  emoji: string;
  category: string;
}

const campusGroups: CampusGroupProps[] = [
  { name: "Engineering Students", members: 456, emoji: "⚙️", category: "Department" },
  { name: "ICT Club KNP", members: 234, emoji: "💻", category: "Club" },
  { name: "KNP Sports", members: 189, emoji: "⚽", category: "Sports" },
  { name: "Business Studies", members: 312, emoji: "📊", category: "Department" },
];

const CampusGroups = () => {
  return (
    <section className="px-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Campus Groups
        </h2>
        <button className="text-xs text-primary font-semibold">See All</button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {campusGroups.map((group, i) => (
          <button
            key={i}
            className="min-w-[140px] p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all flex flex-col gap-2 animate-slide-up"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
          >
            <span className="text-2xl">{group.emoji}</span>
            <div className="text-left">
              <p className="text-xs font-semibold text-foreground leading-tight">{group.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{group.members} members</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-secondary text-muted-foreground self-start">
              {group.category}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CampusGroups;
