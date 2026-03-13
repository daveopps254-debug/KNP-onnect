import { Calendar, MapPin, Clock } from "lucide-react";

interface EventCardProps {
  title: string;
  date: string;
  time: string;
  location: string;
  emoji: string;
  attendees: number;
}

const upcomingEvents: EventCardProps[] = [
  {
    title: "Tech Innovation Week",
    date: "Feb 10, 2026",
    time: "9:00 AM",
    location: "Main Hall",
    emoji: "🚀",
    attendees: 120,
  },
  {
    title: "Inter-Department Football",
    date: "Feb 14, 2026",
    time: "2:00 PM",
    location: "Sports Ground",
    emoji: "⚽",
    attendees: 85,
  },
  {
    title: "Career Fair 2026",
    date: "Feb 20, 2026",
    time: "10:00 AM",
    location: "Conference Center",
    emoji: "💼",
    attendees: 200,
  },
];

const CampusEvents = () => {
  return (
    <section className="px-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" />
          Upcoming Events
        </h2>
        <button className="text-xs text-primary font-semibold">See All</button>
      </div>
      <div className="flex flex-col gap-2">
        {upcomingEvents.map((event, i) => (
          <button
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/20 transition-all text-left animate-slide-up"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
              {event.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {event.date}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {event.location}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-primary font-medium">{event.attendees} going</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CampusEvents;
