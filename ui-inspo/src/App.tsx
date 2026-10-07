import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type SVGProps,
} from "react"

type IconProps = SVGProps<SVGSVGElement>

function Icon({
  children,
  className = "size-5",
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </Icon>
)

const CalendarIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M8 3v4m8-4v4M3 10h18" />
  </Icon>
)

const PinIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="2.5" />
  </Icon>
)

const SparkleIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 2c.6 4.1 2.9 6.4 7 7-4.1.6-6.4 2.9-7 7-.6-4.1-2.9-6.4-7-7 4.1-.6 6.4-2.9 7-7Z" />
    <path d="M19 16c.25 1.7 1.3 2.75 3 3-1.7.25-2.75 1.3-3 3-.25-1.7-1.3-2.75-3-3 1.7-.25 2.75-1.3 3-3Z" />
  </Icon>
)

const HomeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
  </Icon>
)

const TicketIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 8.5V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.5a3.5 3.5 0 0 0 0 7V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.5a3.5 3.5 0 0 0 0-7Z" />
    <path d="M13 7h-2m2 5h-2m2 5h-2" />
  </Icon>
)

const HostIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 10h16l-1.5-5h-13L4 10Z" />
    <path d="M5 10v10h14V10M9 20v-6h6v6" />
    <path d="M3 10c0 1.4 1.1 2.5 2.5 2.5S8 11.4 8 10c0 1.4 1.1 2.5 2.5 2.5S13 11.4 13 10c0 1.4 1.1 2.5 2.5 2.5S18 11.4 18 10c0 1.4 1.1 2.5 2.5 2.5S23 11.4 23 10" />
  </Icon>
)

const ArrowLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m15 18-6-6 6-6" />
  </Icon>
)

const BulbIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 18h6M10 22h4" />
    <path d="M8.2 14.5a7 7 0 1 1 7.6 0c-.6.4-.8 1.1-.8 1.5H9c0-.4-.2-1.1-.8-1.5Z" />
  </Icon>
)

const TrendIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m5 15 5-5 4 4 5-6" />
    <path d="M14 8h5v5" />
  </Icon>
)

const TagIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 13 13 20 4 11V4h7l9 9Z" />
    <circle cx="8.5" cy="8.5" r="1" />
  </Icon>
)

const ClockIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
)

const CalendarWeekIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M8 3v4m8-4v4M3 10h18M7 14h2m2 0h2m2 0h2" />
  </Icon>
)

const BellIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M10 21h4" />
  </Icon>
)

const HistoryIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5m4-1v5l3 2" />
  </Icon>
)

const XCircleIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6m0-6-6 6" />
  </Icon>
)

const CompassIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" />
  </Icon>
)

const ChevronRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9 18 6-6-6-6" />
  </Icon>
)

const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

const SettingsIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
  </Icon>
)

const ShieldIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
)

type EventDetails = {
  id: number
  title: string
  category: string
  date: string
  location: string
  price: string
  seats: string
  image: string
  imageAlt: string
  aiPick?: boolean
}

type EventDraft = Pick<EventDetails, "title" | "category" | "date" | "location" | "price">

const events: EventDetails[] = [
  {
    id: 1,
    title: "DIU AI Hackathon 2026",
    category: "Hackathon",
    date: "15 Oct 2026",
    location: "DIU Campus, Savar",
    price: "৳300",
    seats: "128 seats left",
    image:
      "https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Developers collaborating at a hackathon",
    aiPick: true,
  },
  {
    id: 2,
    title: "Career Fair: Tech Companies",
    category: "Career Fair",
    date: "20 Oct 2026",
    location: "DIU Auditorium",
    price: "Free",
    seats: "240 seats left",
    image:
      "https://images.unsplash.com/photo-1780035206636-3b2969fa024c?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Professional networking at a technology event",
    aiPick: true,
  },
  {
    id: 3,
    title: "Cultural Night: Spring Fest",
    category: "Cultural",
    date: "28 Oct 2026",
    location: "DIU Open Ground",
    price: "৳100",
    seats: "480 seats left",
    image:
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Crowd enjoying a colorful night concert",
  },
]

const categories = ["All", "Hackathon", "Workshop", "Cultural", "Career Fair"]

const aiSignals = [
  { label: "Event category", icon: TagIcon },
  { label: "Ticket price", icon: TicketIcon },
  { label: "Days before event", icon: CalendarIcon },
  { label: "Payment delay", icon: ClockIcon },
  { label: "Event day of week", icon: CalendarWeekIcon },
  { label: "Event start hour", icon: ClockIcon },
  { label: "Location type", icon: PinIcon },
  { label: "Reminder status", icon: BellIcon },
  { label: "Prior attendance", icon: HistoryIcon },
  { label: "Cancellation status", icon: XCircleIcon },
]

function Card({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <article className={`rounded-card bg-white shadow-card ${className}`}>
      {children}
    </article>
  )
}

function Pill({
  children,
  tone = "blue",
}: {
  children: ReactNode
  tone?: "blue" | "yellow"
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-bold backdrop-blur-md ${
        tone === "yellow"
          ? "bg-upay-yellow text-upay-navy shadow-pill"
          : "bg-upay-blue-soft/95 text-upay-navy"
      }`}
    >
      {children}
    </span>
  )
}

function Button({
  children,
  variant = "primary",
  onClick,
}: {
  children: ReactNode
  variant?: "primary" | "light"
  onClick?: () => void
}) {
  return (
    <button
      className={`inline-flex h-11 items-center justify-center rounded-button px-5 text-sm font-bold shadow-button transition-all active:scale-[0.98] ${
        variant === "light"
          ? "bg-white text-upay-navy hover:bg-upay-yellow-soft"
          : "bg-upay-yellow text-upay-navy hover:bg-upay-yellow-deep"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

function EventCard({
  event,
  isRegistered,
  onRegister,
  registeredLabel = "Added to My Events",
}: {
  event: EventDetails
  isRegistered: boolean
  onRegister: () => void
  registeredLabel?: string
}) {
  return (
    <Card className="event-card overflow-hidden p-3">
      <div className="relative h-44 overflow-hidden rounded-image bg-event-placeholder">
        <img
          alt={event.imageAlt}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          src={event.image}
        />
        <div className="absolute inset-0 bg-image-overlay" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <Pill>{event.category}</Pill>
          {event.aiPick ? <Pill tone="yellow">✨ AI Pick</Pill> : null}
        </div>
      </div>

      <div className="px-1 pb-1 pt-4">
        <h3 className="text-lg font-extrabold leading-snug tracking-tight text-upay-navy">
          {event.title}
        </h3>

        <div className="mt-3 space-y-2 text-sm font-medium text-upay-navy/58">
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-4 shrink-0 text-upay-blue" />
            <span>{event.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <PinIcon className="size-4 shrink-0 text-upay-blue" />
            <span>{event.location}</span>
          </div>
        </div>

        <div className="my-4 h-px bg-upay-blue/8" />

        <div className="mb-3.5 flex items-end justify-between">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-upay-navy/40">
              Entry
            </p>
            <p className="mt-0.5 text-lg font-extrabold text-upay-blue">
              {event.price}
            </p>
          </div>
          <p className="pb-0.5 text-xs font-semibold text-upay-navy/42">
            {event.seats}
          </p>
        </div>

        <button
          className={`flex h-12 w-full items-center justify-center rounded-button text-sm font-extrabold shadow-button transition-all active:scale-[0.98] ${
            isRegistered
              ? "bg-upay-blue text-white"
              : "bg-upay-yellow text-upay-navy hover:bg-upay-yellow-deep"
          }`}
          onClick={onRegister}
          type="button"
        >
          {isRegistered ? registeredLabel : "Register with Upay"}
        </button>
      </div>
    </Card>
  )
}

type MainPage = "Home" | "Discover" | "My Events" | "AI"
type Page = MainPage | "Profile" | "Create Event"

const navItems = [
  { label: "Home", icon: HomeIcon },
  { label: "Discover", icon: CompassIcon },
  { label: "My Events", icon: CalendarIcon },
  { label: "AI", icon: SparkleIcon },
] satisfies { label: MainPage icon: (props: IconProps) => ReactNode }[]

function BottomNav({
  activePage,
  onChange,
}: {
  activePage: Page
  onChange: (page: MainPage) => void
}) {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-white/70 bg-white/78 px-3 pb-safe pt-2 shadow-nav backdrop-blur-2xl lg:hidden"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {navItems.map(({ label, icon: NavIcon }) => {
          const isActive = activePage === label
          return (
            <button
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[0.6875rem] font-semibold transition-colors ${
                isActive
                  ? "text-upay-blue"
                  : "text-upay-navy/38 hover:text-upay-blue"
              }`}
              key={label}
              onClick={() => onChange(label)}
              type="button"
            >
              <span
                className={`grid size-9 place-items-center rounded-full transition-all ${
                  isActive ? "bg-upay-yellow shadow-active" : "bg-transparent"
                }`}
              >
                <NavIcon className="size-5" />
              </span>
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function DesktopSidebar({
  activePage,
  onChange,
}: {
  activePage: Page
  onChange: (page: MainPage) => void
}) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-upay-blue/7 bg-white/72 px-4 py-7 backdrop-blur-2xl lg:flex xl:w-64 xl:px-5">
      <div className="flex items-center gap-3 px-2">
        <span className="grid size-10 place-items-center rounded-logo bg-upay-yellow text-xl font-black text-upay-blue shadow-logo">
          U
        </span>
        <div>
          <p className="text-base font-extrabold tracking-tight text-upay-navy">
            UpayEvents
          </p>
          <p className="text-[0.625rem] font-bold uppercase tracking-brand text-upay-navy/35">
            Event hub
          </p>
        </div>
      </div>

      <nav aria-label="Desktop navigation" className="mt-10 space-y-2">
        {navItems.map(({ label, icon: NavIcon }) => {
          const isActive = activePage === label
          return (
            <button
              aria-current={isActive ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition-all ${
                isActive
                  ? "bg-upay-yellow text-upay-navy shadow-active"
                  : "text-upay-navy/48 hover:bg-upay-blue-soft hover:text-upay-blue"
              }`}
              key={label}
              onClick={() => onChange(label)}
              type="button"
            >
              <span
                className={`grid size-9 place-items-center rounded-xl ${
                  isActive ? "bg-white/55" : "bg-upay-blue-soft"
                }`}
              >
                <NavIcon className="size-5" />
              </span>
              {label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto rounded-card bg-upay-blue px-4 py-5 text-white shadow-card">
        <span className="grid size-9 place-items-center rounded-logo bg-upay-yellow text-base font-black text-upay-blue">
          U!
        </span>
        <p className="mt-3 text-sm font-extrabold">Powered by Upay</p>
        <p className="mt-1 text-[0.6875rem] font-medium leading-relaxed text-white/60">
          Discover, register, and grow every event.
        </p>
      </div>
    </aside>
  )
}

function AvatarButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      aria-label="Open Sadika Sharif's profile"
      className="grid size-10 shrink-0 place-items-center rounded-full bg-upay-blue text-xs font-extrabold text-white shadow-avatar ring-2 ring-white"
      onClick={onClick}
      title="Sadika Sharif"
      type="button"
    >
      SS
    </button>
  )
}

function PageHeader({
  title,
  subtitle,
  onOpenProfile,
}: {
  title: string
  subtitle: string
  onOpenProfile: () => void
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4 lg:mb-8">
      <div>
        <p className="text-xl font-extrabold tracking-tight text-upay-navy lg:text-2xl">
          {title}
        </p>
        <p className="mt-1 text-xs font-medium text-upay-navy/42">{subtitle}</p>
      </div>
      <AvatarButton onClick={onOpenProfile} />
    </header>
  )
}

function AIPage({ onOpenProfile }: { onOpenProfile: () => void }) {
  const [selectedEvent, setSelectedEvent] = useState(1)
  const reasons = [
    { label: "Cancellation status", value: 38, color: "bg-upay-yellow" },
    { label: "Reminder opened", value: 32, color: "bg-upay-blue" },
    { label: "Prior attendance", value: 14, color: "bg-upay-yellow" },
    { label: "Days before event", value: 4, color: "bg-upay-blue" },
  ]

  return (
    <div className="dashboard-background relative flex flex-1 flex-col px-5 pb-32 pt-5 sm:px-8 sm:pt-7 lg:px-10 lg:pb-12 lg:pt-8 xl:px-12">
      <PageHeader
        onOpenProfile={onOpenProfile}
        subtitle="Predictions and actions for your events"
        title="AI Forecast"
      />

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-extrabold text-upay-navy">Your Events</p>
          <p className="text-[0.6875rem] font-semibold text-upay-blue/55">
            <span className="lg:hidden">Swipe to explore</span>
            <span className="hidden lg:inline">Select an event</span>
          </p>
        </div>
        <div className="-mx-5 overflow-x-auto px-5 pb-2 scrollbar-none sm:-mx-8 sm:px-8 lg:mx-0 lg:overflow-visible lg:px-0">
          <div className="flex w-max gap-3 lg:grid lg:w-full lg:grid-cols-3">
            {events.map((event) => {
              const selected = selectedEvent === event.id
              return (
                <button
                  aria-pressed={selected}
                  className={`flex w-52 items-center gap-3 rounded-2xl border-2 bg-white/90 p-2.5 text-left shadow-chip transition-all lg:w-auto ${
                    selected
                      ? "border-upay-yellow"
                      : "border-transparent opacity-70"
                  }`}
                  key={event.id}
                  onClick={() => setSelectedEvent(event.id)}
                  type="button"
                >
                  <img
                    alt=""
                    className="size-12 shrink-0 rounded-xl object-cover"
                    src={event.image}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-extrabold text-upay-navy">
                      {event.title}
                    </span>
                    <span className="mt-1 block text-[0.6875rem] font-semibold text-upay-navy/42">
                      {event.date.replace(" 2026", "")}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <div className="lg:grid lg:grid-cols-3 lg:gap-4">
        <section className="forecast-glow relative mb-4 lg:col-span-2">
          <Card className="relative overflow-hidden border border-white/80 px-5 py-6 text-center">
            <div className="absolute -right-10 -top-12 size-32 rounded-full bg-upay-blue/5" />
            <div className="absolute -bottom-12 -left-8 size-28 rounded-full bg-upay-yellow/14" />
            <div className="relative">
              <Pill tone="yellow">
                <SparkleIcon className="mr-1 size-3.5" />
                AI Forecast
              </Pill>
              <p className="mt-4 text-[1.7rem] font-extrabold leading-tight tracking-tight text-upay-navy">
                408 predicted attendees
              </p>
              <p className="mt-1.5 text-xs font-medium text-upay-navy/42">
                out of 500 paid registrations
              </p>
              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-upay-blue/8">
                <div className="forecast-progress h-full w-[81.6%] rounded-full" />
              </div>
              <div className="mt-2 flex justify-between text-[0.625rem] font-bold text-upay-navy/35">
                <span>0</span>
                <span>81.6% expected</span>
                <span>500</span>
              </div>
            </div>
          </Card>
        </section>

        <article className="sponsor-banner relative mb-4 overflow-hidden rounded-card border border-white/80 p-4 shadow-card lg:flex lg:items-center">
          <div className="absolute -right-8 -top-10 size-28 rounded-full border border-white/55" />
          <div className="relative flex items-center gap-4">
            <span
              aria-hidden="true"
              className="grid size-12 shrink-0 place-items-center rounded-logo bg-upay-yellow text-lg font-extrabold tracking-tight text-upay-navy shadow-logo ring-4 ring-white/45"
            >
              U!
            </span>
            <div className="min-w-0">
              <p className="text-[0.625rem] font-bold uppercase tracking-brand text-upay-navy/60">
                Why this matters to Upay
              </p>
              <p className="mt-1.5 text-base font-extrabold leading-snug tracking-tight text-upay-navy">
                Every event registration flows through Upay.
              </p>
              <p className="mt-1 text-[0.6875rem] font-semibold leading-relaxed text-upay-navy/58">
                More transactions. More merchants. More wallet activity.
              </p>
            </div>
          </div>
        </article>

        <section className="relative mb-4 grid grid-cols-3 gap-2 lg:col-span-3 lg:gap-4">
          <div className="pointer-events-none absolute left-[21%] right-[21%] top-7 border-t border-dashed border-upay-blue/16" />
          {[
            { value: "500", label: "Paid Registrations" },
            { value: "92", label: "Predicted No-Shows" },
            { value: "18.4%", label: "No-Show Rate", trend: true },
          ].map((metric) => (
            <Card
              className="relative min-h-28 px-2 py-4 text-center"
              key={metric.label}
            >
              <span className="mx-auto mb-2 block size-2 rounded-full bg-upay-yellow ring-4 ring-white" />
              <p className="text-xl font-extrabold tracking-tight text-upay-navy">
                {metric.value}
              </p>
              <p className="mx-auto mt-1 max-w-24 text-[0.625rem] font-semibold leading-snug text-upay-navy/42">
                {metric.label}
                {metric.trend ? (
                  <TrendIcon className="ml-1 inline size-3 text-upay-yellow-deep" />
                ) : null}
              </p>
            </Card>
          ))}
        </section>
      </div>

      <section className="mb-4 grid grid-cols-[0.85fr_1.15fr] gap-3 lg:grid-cols-2 lg:gap-4">
        <Card className="confidence-card p-4">
          <p className="text-[0.625rem] font-bold uppercase tracking-wide text-upay-navy/42">
            Prediction Confidence
          </p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-2xl font-extrabold text-upay-navy">88.6%</p>
            <Pill tone="yellow">High</Pill>
          </div>
          <p className="mt-2 text-[0.625rem] font-medium leading-snug text-upay-navy/38">
            Based on 500 registrations
          </p>
        </Card>

        <article className="recommendation-card rounded-card border border-upay-yellow/45 p-4 shadow-card">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-upay-yellow text-upay-blue shadow-pill">
              <BulbIcon className="size-4" />
            </span>
            <p className="text-[0.625rem] font-extrabold uppercase tracking-wide text-upay-navy">
              Recommended Action
            </p>
          </div>
          <p className="text-xs font-extrabold leading-relaxed text-upay-navy">
            Open 30 waitlist slots and send a confirmation reminder tonight.
          </p>
          <p className="mt-2 text-[0.625rem] font-medium text-upay-navy/42">
            Based on current no-show risk
          </p>
        </article>
      </section>

      <div className="lg:grid lg:grid-cols-2 lg:gap-4">
        <Card className="mb-4 p-5">
          <div className="mb-4">
            <p className="text-sm font-extrabold text-upay-navy">
              What the AI looks at
            </p>
            <p className="mt-1 text-[0.6875rem] font-medium text-upay-navy/42">
              10 signals from every registration
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {aiSignals.map(({ label, icon: SignalIcon }) => (
              <div
                className="group flex min-h-12 items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 shadow-chip transition-colors hover:bg-upay-yellow-soft"
                key={label}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-upay-blue-soft text-upay-blue transition-colors group-hover:bg-upay-yellow">
                  <SignalIcon className="size-3.5" />
                </span>
                <p className="text-[0.6875rem] font-semibold leading-tight text-upay-navy">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-4 border-t border-upay-blue/7 pt-3 text-[0.625rem] font-medium leading-relaxed text-upay-navy/40">
            None of this uses real customer data. All inputs are synthetic for
            the hackathon.
          </p>
        </Card>

        <Card className="mb-4 p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-extrabold text-upay-navy">
                Why this prediction?
              </p>
              <p className="mt-1 text-[0.625rem] font-medium text-upay-navy/38">
                Top factors influencing the forecast
              </p>
            </div>
            <span className="grid size-8 place-items-center rounded-full bg-upay-blue-soft text-upay-blue">
              <SparkleIcon className="size-4" />
            </span>
          </div>
          <div className="space-y-4">
            {reasons.map((reason) => (
              <div
                className="grid grid-cols-[7rem_1fr_2rem] items-center gap-2"
                key={reason.label}
              >
                <p className="truncate text-[0.6875rem] font-semibold text-upay-navy/62">
                  {reason.label}
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-upay-blue/7">
                  <div
                    className={`h-full rounded-full ${reason.color} ${
                      reason.value === 38
                        ? "w-[95%]"
                        : reason.value === 32
                          ? "w-[80%]"
                          : reason.value === 14
                            ? "w-[35%]"
                            : "w-[10%]"
                    }`}
                  />
                </div>
                <p className="text-right text-[0.6875rem] font-extrabold text-upay-navy">
                  {reason.value}%
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <article className="flex items-center justify-between rounded-card border border-upay-blue/8 bg-white/74 px-4 py-3 shadow-chip backdrop-blur-xl">
        <div>
          <p className="text-[0.625rem] font-bold uppercase tracking-wide text-upay-navy/38">
            Live Check-ins
          </p>
          <p className="mt-1 text-lg font-extrabold text-upay-navy">
            312 <span className="text-sm text-upay-navy/32">/ 408</span>
          </p>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1 text-[0.625rem] font-bold text-upay-blue">
            <span className="size-1.5 rounded-full bg-upay-yellow shadow-pill" />
            Live update
          </span>
          <p className="mt-1 text-[0.625rem] font-medium text-upay-navy/42">
            AI predicted 408. Error: 23.5%.
          </p>
        </div>
      </article>
    </div>
  )
}

function HomePage({
  registeredEvents,
  onNavigate,
  onOpenProfile,
}: {
  registeredEvents: EventDetails[]
  onNavigate: (page: MainPage) => void
  onOpenProfile: () => void
}) {
  const upcomingEvent = registeredEvents[0]

  return (
    <div className="relative flex flex-1 flex-col px-5 pb-32 pt-5 sm:px-8 sm:pt-7 lg:px-10 lg:pb-12 lg:pt-8 xl:px-12">
      <PageHeader
        onOpenProfile={onOpenProfile}
        subtitle="Here’s what’s happening around you"
        title="Hello, Sadika"
      />

      <div className="lg:mb-6 lg:grid lg:grid-cols-[1.6fr_1fr] lg:gap-5">
        <section className="hero-banner relative mb-5 overflow-hidden rounded-hero p-6 text-white shadow-hero lg:mb-0 lg:min-h-72 lg:p-8">
          <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full border-[2.5rem] border-white/10" />
          <div className="pointer-events-none absolute bottom-5 right-6 size-12 rounded-full bg-upay-yellow/25 blur-xl" />
          <div className="relative z-[1] max-w-64">
            <p className="mb-2 text-[0.6875rem] font-bold uppercase tracking-brand text-white/72">
              Your event hub
            </p>
            <p className="text-[1.65rem] font-extrabold leading-[1.12] tracking-tight lg:text-4xl">
              Find your next
              <br />
              campus moment.
            </p>
            <div className="mt-5">
              <Button onClick={() => onNavigate("Discover")} variant="light">
                Explore events
              </Button>
            </div>
          </div>
        </section>

        <section className="mb-5 grid grid-cols-2 gap-3 lg:mb-0 lg:grid-cols-1 lg:gap-5">
          <Card className="p-4 lg:p-5">
            <span className="mb-3 grid size-9 place-items-center rounded-xl bg-upay-yellow-soft text-upay-blue">
              <CalendarIcon className="size-4" />
            </span>
            <p className="text-2xl font-extrabold text-upay-navy">
              {registeredEvents.length}
            </p>
            <p className="mt-1 text-xs font-semibold text-upay-navy/42">
              Registered events
            </p>
          </Card>
          <Card className="p-4 lg:p-5">
            <span className="mb-3 grid size-9 place-items-center rounded-xl bg-upay-blue-soft text-upay-blue">
              <SparkleIcon className="size-4" />
            </span>
            <p className="text-2xl font-extrabold text-upay-navy">2</p>
            <p className="mt-1 text-xs font-semibold text-upay-navy/42">
              AI picks for you
            </p>
          </Card>
        </section>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-5">
        <section className="mb-5 lg:mb-0">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-extrabold text-upay-navy">Up next</p>
            {upcomingEvent ? (
              <button
                className="flex items-center gap-1 text-xs font-bold text-upay-blue"
                onClick={() => onNavigate("My Events")}
                type="button"
              >
                View all
                <ChevronRightIcon className="size-3.5" />
              </button>
            ) : null}
          </div>

          {upcomingEvent ? (
            <Card className="event-card flex items-center gap-3 p-3">
              <img
                alt={upcomingEvent.imageAlt}
                className="size-20 shrink-0 rounded-image object-cover"
                src={upcomingEvent.image}
              />
              <div className="min-w-0 flex-1">
                <Pill>{upcomingEvent.category}</Pill>
                <p className="mt-2 truncate text-sm font-extrabold text-upay-navy">
                  {upcomingEvent.title}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[0.6875rem] font-semibold text-upay-navy/45">
                  <CalendarIcon className="size-3.5 text-upay-blue" />
                  {upcomingEvent.date}
                </p>
              </div>
            </Card>
          ) : (
            <Card className="border border-upay-blue/7 p-5 text-center">
              <span className="mx-auto grid size-11 place-items-center rounded-full bg-upay-yellow-soft text-upay-blue">
                <TicketIcon className="size-5" />
              </span>
              <p className="mt-3 text-sm font-extrabold text-upay-navy">
                Your calendar is open
              </p>
              <p className="mx-auto mt-1 max-w-64 text-xs font-medium leading-relaxed text-upay-navy/42">
                Register for an event and it will appear here.
              </p>
              <button
                className="mt-4 text-xs font-extrabold text-upay-blue"
                onClick={() => onNavigate("Discover")}
                type="button"
              >
                Browse events
              </button>
            </Card>
          )}
        </section>

        <section className="mb-5 lg:mb-0">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-extrabold text-upay-navy">
              Featured for you
            </p>
            <Pill tone="yellow">AI Pick</Pill>
          </div>
          <Card className="event-card overflow-hidden p-3">
            <div className="relative h-32 overflow-hidden rounded-image">
              <img
                alt={events[0].imageAlt}
                className="h-full w-full object-cover"
                src={events[0].image}
              />
              <div className="absolute inset-0 bg-image-overlay" />
            </div>
            <div className="flex items-center justify-between gap-3 px-1 pb-1 pt-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-upay-navy">
                  {events[0].title}
                </p>
                <p className="mt-1 text-[0.6875rem] font-semibold text-upay-navy/42">
                  {events[0].date} · {events[0].price}
                </p>
              </div>
              <button
                aria-label="View featured event in Discover"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-upay-yellow text-upay-blue shadow-button"
                onClick={() => onNavigate("Discover")}
                type="button"
              >
                <ChevronRightIcon className="size-4" />
              </button>
            </div>
          </Card>
        </section>

        <button
          className="recommendation-card mb-4 flex items-center gap-3 rounded-card border border-upay-yellow/45 p-4 text-left shadow-card lg:mb-0 lg:self-stretch"
          onClick={() => onNavigate("AI")}
          type="button"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-upay-yellow text-upay-blue shadow-pill">
            <SparkleIcon className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.625rem] font-bold uppercase tracking-brand text-upay-navy/50">
              AI insight
            </span>
            <span className="mt-1 block text-sm font-extrabold text-upay-navy">
              408 attendees predicted
            </span>
          </span>
          <ChevronRightIcon className="size-4 shrink-0 text-upay-blue" />
        </button>
      </div>
    </div>
  )
}

function DiscoverPage({
  registered,
  onToggleRegistration,
  onOpenProfile,
}: {
  registered: number[]
  onToggleRegistration: (id: number) => void
  onOpenProfile: () => void
}) {
  const [activeCategory, setActiveCategory] = useState("All")
  const [search, setSearch] = useState("")
  const eventsRef = useRef<HTMLDivElement>(null)

  const visibleEvents = useMemo(() => {
    const query = search.trim().toLowerCase()
    return events.filter((event) => {
      const matchesCategory =
        activeCategory === "All" || event.category === activeCategory
      const matchesSearch =
        !query ||
        `${event.title} ${event.category} ${event.location}`
          .toLowerCase()
          .includes(query)
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, search])

  return (
    <div className="relative flex flex-1 flex-col px-5 pb-32 pt-5 sm:px-8 sm:pt-7 lg:px-10 lg:pb-12 lg:pt-8 xl:px-12">
      <header className="mb-5 flex items-center gap-3 lg:mb-8">
        <div
          className="flex shrink-0 items-center gap-1.5"
          aria-label="UpayEvents"
        >
          <span className="grid size-8 place-items-center rounded-logo bg-upay-yellow text-lg font-black text-upay-blue shadow-logo">
            U
          </span>
          <span className="hidden text-sm font-extrabold tracking-tight text-upay-navy min-[390px]:inline lg:text-xl">
            Discover
          </span>
        </div>

        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 text-upay-navy/40 shadow-search backdrop-blur-xl lg:ml-6 lg:max-w-xl">
          <SearchIcon className="size-4 shrink-0" />
          <input
            aria-label="Search events"
            className="min-w-0 flex-1 bg-transparent text-xs font-medium text-upay-navy outline-none placeholder:text-upay-navy/35"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search events..."
            type="search"
            value={search}
          />
        </label>

        <AvatarButton onClick={onOpenProfile} />
      </header>

      <section className="hero-banner relative mb-6 min-h-52 overflow-hidden rounded-hero p-6 text-white shadow-hero lg:min-h-64 lg:p-8">
        <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full border-[2.5rem] border-white/10" />
        <div className="pointer-events-none absolute right-16 top-8 size-12 rounded-full bg-upay-yellow/25 blur-xl" />
        <div className="relative z-[1] max-w-64">
          <p className="mb-2 text-[0.6875rem] font-bold uppercase tracking-brand text-white/72">
            Powered by Upay
          </p>
          <p className="text-[1.65rem] font-extrabold leading-[1.12] tracking-tight lg:text-4xl">
            Discover events.
            <br />
            Register with Upay.
          </p>
          <div className="mt-5">
            <Button
              onClick={() =>
                eventsRef.current?.scrollIntoView({ behavior: "smooth" })
              }
              variant="light"
            >
              Browse Events
            </Button>
          </div>
        </div>
        <div className="hero-wave absolute inset-x-0 bottom-0 h-14" />
      </section>

      <div className="-mx-5 mb-7 overflow-x-auto px-5 scrollbar-none sm:-mx-8 sm:px-8 lg:mx-0 lg:overflow-visible lg:px-0">
        <div className="flex w-max gap-2 lg:w-auto lg:flex-wrap">
          {categories.map((category) => {
            const isActive = category === activeCategory
            return (
              <button
                className={`h-9 rounded-full border px-4 text-xs font-bold shadow-chip transition-all ${
                  isActive
                    ? "border-upay-yellow bg-upay-yellow text-upay-navy"
                    : "border-upay-navy/10 bg-white/85 text-upay-navy/60 backdrop-blur-md hover:border-upay-blue/30"
                }`}
                key={category}
                onClick={() => setActiveCategory(category)}
                type="button"
              >
                {category}
              </button>
            )
          })}
        </div>
      </div>

      <section className="mb-4">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-upay-yellow-soft text-upay-blue">
            <SparkleIcon className="size-4" />
          </span>
          <p className="text-xl font-extrabold tracking-tight">
            Recommended for you
          </p>
        </div>
        <p className="ml-10 mt-1 text-xs font-medium text-upay-navy/45">
          Based on your interests: Hackathons, Tech
        </p>
      </section>

      <div
        className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
        ref={eventsRef}
      >
        {visibleEvents.map((event) => (
          <EventCard
            event={event}
            isRegistered={registered.includes(event.id)}
            key={event.id}
            onRegister={() => onToggleRegistration(event.id)}
          />
        ))}
        {visibleEvents.length === 0 ? (
          <Card className="p-8 text-center md:col-span-2 xl:col-span-3">
            <SearchIcon className="mx-auto mb-3 size-6 text-upay-blue/35" />
            <p className="font-bold">No events found</p>
            <p className="mt-1 text-sm text-upay-navy/45">
              Try another search or category.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

function CreateEventPage({
  onBack,
  onCreate,
}: {
  onBack: () => void
  onCreate: (event: EventDraft) => void
}) {
  const [draft, setDraft] = useState({
    title: "",
    category: "Workshop",
    date: "",
    location: "",
    price: "",
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formattedDate = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${draft.date}T12:00:00`))

    onCreate({
      ...draft,
      date: formattedDate,
      price: draft.price || "Free",
    })
  }

  const fieldClass =
    "mt-2 h-12 w-full rounded-button border border-upay-blue/10 bg-white px-4 text-sm font-semibold text-upay-navy outline-none shadow-chip transition-colors focus:border-upay-blue/35"

  return (
    <div className="relative flex flex-1 flex-col px-5 pb-32 pt-5 sm:px-8 sm:pt-7 lg:px-10 lg:pb-12 lg:pt-8 xl:px-12">
      <div className="w-full max-w-3xl lg:mx-auto">
        <header className="mb-7 flex items-center gap-3">
          <button
            aria-label="Back to My Events"
            className="grid size-10 place-items-center rounded-full border border-upay-blue/8 bg-white/80 text-upay-navy shadow-search backdrop-blur-xl"
            onClick={onBack}
            type="button"
          >
            <ArrowLeftIcon className="size-5" />
          </button>
          <div>
            <p className="text-xl font-extrabold tracking-tight text-upay-navy lg:text-2xl">
              Create Event
            </p>
            <p className="mt-1 text-xs font-medium text-upay-navy/42">
              Publish a new event for your community
            </p>
          </div>
        </header>

        <Card className="mb-5 overflow-hidden p-5 sm:p-7">
          <div className="mb-6 flex items-center gap-3 rounded-card bg-upay-yellow-soft p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-upay-yellow text-upay-blue shadow-pill">
              <CalendarIcon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-upay-navy">
                Event details
              </p>
              <p className="mt-1 text-xs font-medium text-upay-navy/45">
                You can manage the event after creating it.
              </p>
            </div>
          </div>

          <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
            <label className="block text-xs font-bold text-upay-navy md:col-span-2">
              Event name
              <input
                className={fieldClass}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="e.g. Design Thinking Workshop"
                required
                type="text"
                value={draft.title}
              />
            </label>

            <label className="block text-xs font-bold text-upay-navy">
              Category
              <select
                className={fieldClass}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                value={draft.category}
              >
                {categories.slice(1).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-bold text-upay-navy">
              Date
              <input
                className={fieldClass}
                min="2026-01-01"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
                required
                type="date"
                value={draft.date}
              />
            </label>

            <label className="block text-xs font-bold text-upay-navy">
              Location
              <input
                className={fieldClass}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
                placeholder="Venue or campus location"
                required
                type="text"
                value={draft.location}
              />
            </label>

            <label className="block text-xs font-bold text-upay-navy">
              Ticket price
              <input
                className={fieldClass}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
                placeholder="Free or ৳300"
                type="text"
                value={draft.price}
              />
            </label>

            <button
              className="flex h-12 w-full items-center justify-center gap-2 rounded-button bg-upay-yellow text-sm font-extrabold text-upay-navy shadow-button transition-all hover:bg-upay-yellow-deep active:scale-[0.98] md:col-span-2"
              type="submit"
            >
              <PlusIcon className="size-4" />
              Create event
            </button>
          </form>
        </Card>
      </div>
    </div>
  )
}

function MyEventsPage({
  registeredEvents,
  hostedEvents,
  onRemove,
  onDiscover,
  onCreate,
  onOpenProfile,
}: {
  registeredEvents: EventDetails[]
  hostedEvents: EventDetails[]
  onRemove: (id: number) => void
  onDiscover: () => void
  onCreate: () => void
  onOpenProfile: () => void
}) {
  const eventCount = registeredEvents.length + hostedEvents.length

  return (
    <div className="relative flex flex-1 flex-col px-5 pb-32 pt-5 sm:px-8 sm:pt-7 lg:px-10 lg:pb-12 lg:pt-8 xl:px-12">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-extrabold tracking-tight text-upay-navy lg:text-2xl">
            My Events
          </p>
          <p className="mt-1 text-xs font-medium text-upay-navy/42">
            {eventCount} {eventCount === 1 ? "event" : "events"} in your hub
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Create a new event"
            className="grid size-10 place-items-center rounded-full bg-upay-yellow text-upay-blue shadow-button transition-transform active:scale-95"
            onClick={onCreate}
            title="Create event"
            type="button"
          >
            <PlusIcon className="size-5" />
          </button>
          <AvatarButton onClick={onOpenProfile} />
        </div>
      </header>

      {hostedEvents.length ? (
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-extrabold text-upay-navy">
              Hosted by you
            </p>
            <Pill tone="yellow">{hostedEvents.length} live</Pill>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {hostedEvents.map((event) => (
              <Card
                className="event-card flex items-center gap-3 p-3"
                key={event.id}
              >
                <img
                  alt={event.imageAlt}
                  className="size-20 shrink-0 rounded-image object-cover"
                  src={event.image}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-upay-navy">
                    {event.title}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[0.6875rem] font-semibold text-upay-navy/45">
                    <CalendarIcon className="size-3.5 text-upay-blue" />
                    {event.date}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-[0.6875rem] font-semibold text-upay-navy/45">
                    <PinIcon className="size-3.5 shrink-0 text-upay-blue" />
                    {event.location}
                  </p>
                </div>
                <span className="size-2 shrink-0 rounded-full bg-upay-yellow shadow-pill" />
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {registeredEvents.length ? (
        <section>
          <p className="mb-3 text-sm font-extrabold text-upay-navy">
            Registered events
          </p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {registeredEvents.map((event) => (
              <EventCard
                event={event}
                isRegistered
                key={event.id}
                onRegister={() => onRemove(event.id)}
                registeredLabel="Remove from My Events"
              />
            ))}
          </div>
        </section>
      ) : hostedEvents.length ? null : (
        <Card className="mx-auto mt-8 w-full max-w-xl border border-upay-blue/7 px-6 py-10 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-upay-yellow-soft text-upay-blue shadow-chip">
            <CalendarIcon className="size-7" />
          </span>
          <p className="mt-5 text-lg font-extrabold text-upay-navy">
            No events yet
          </p>
          <p className="mx-auto mt-2 max-w-64 text-sm font-medium leading-relaxed text-upay-navy/45">
            Create your own event or register for one with Upay.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 min-[380px]:flex-row">
            <button
              className="inline-flex h-11 items-center gap-2 rounded-button bg-upay-yellow px-4 text-sm font-bold text-upay-navy shadow-button"
              onClick={onCreate}
              type="button"
            >
              <PlusIcon className="size-4" />
              Create
            </button>
            <Button onClick={onDiscover}>Discover events</Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function ProfilePage({ onBack }: { onBack: () => void }) {
  const profileRows = [
    {
      label: "Host profile",
      detail: "DIU Campus Community",
      icon: HostIcon,
    },
    {
      label: "Account settings",
      detail: "Personal details and preferences",
      icon: SettingsIcon,
    },
    {
      label: "Privacy & security",
      detail: "Protected with Upay",
      icon: ShieldIcon,
    },
  ]

  return (
    <div className="relative flex flex-1 flex-col px-5 pb-32 pt-5 sm:px-8 sm:pt-7 lg:px-10 lg:pb-12 lg:pt-8 xl:px-12">
      <header className="mb-7 flex items-center gap-3">
        <button
          aria-label="Back to previous page"
          className="grid size-10 place-items-center rounded-full border border-upay-blue/8 bg-white/80 text-upay-navy shadow-search backdrop-blur-xl"
          onClick={onBack}
          type="button"
        >
          <ArrowLeftIcon className="size-5" />
        </button>
        <div>
          <p className="text-xl font-extrabold tracking-tight text-upay-navy lg:text-2xl">
            Profile
          </p>
          <p className="mt-1 text-xs font-medium text-upay-navy/42">
            Your UpayEvents account
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-6">
        <Card className="relative overflow-hidden p-6 text-center lg:p-8">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-upay-yellow-soft to-upay-blue-soft" />
          <span className="relative mx-auto grid size-20 place-items-center rounded-full bg-upay-blue text-xl font-extrabold text-white shadow-avatar ring-4 ring-white">
            SS
          </span>
          <p className="mt-4 text-xl font-extrabold text-upay-navy">
            Sadika Sharif
          </p>
          <p className="mt-1 text-sm font-medium text-upay-navy/45">
            Event host · Daffodil International University
          </p>
          <span className="mt-4 inline-flex rounded-full bg-upay-yellow-soft px-3 py-1.5 text-xs font-bold text-upay-blue">
            Upay verified
          </span>
        </Card>

        <div>
          <section className="mt-5 space-y-3 lg:mt-0">
            {profileRows.map(({ label, detail, icon: RowIcon }) => (
              <div
                className="flex items-center gap-3 rounded-card bg-white p-4 shadow-chip"
                key={label}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-upay-blue-soft text-upay-blue">
                  <RowIcon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-upay-navy">
                    {label}
                  </p>
                  <p className="mt-1 truncate text-xs font-medium text-upay-navy/42">
                    {detail}
                  </p>
                </div>
                <ChevronRightIcon className="size-4 shrink-0 text-upay-navy/25" />
              </div>
            ))}
          </section>

          <Card className="mt-5 flex items-center gap-3 p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-upay-yellow text-upay-blue shadow-pill">
              <TicketIcon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-upay-navy">
                Payments by Upay
              </p>
              <p className="mt-1 text-xs font-medium text-upay-navy/42">
                Fast, secure event registration
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [activePage, setActivePage] = useState<Page>("Home")
  const [previousMainPage, setPreviousMainPage] = useState<MainPage>("Home")
  const [registered, setRegistered] = useState<number[]>([])
  const [hostedEvents, setHostedEvents] = useState<EventDetails[]>([])

  const registeredEvents = events.filter((event) =>
    registered.includes(event.id),
  )

  function navigate(page: MainPage) {
    setPreviousMainPage(page)
    setActivePage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function openProfile() {
    if (activePage !== "Profile" && activePage !== "Create Event") {
      setPreviousMainPage(activePage)
    }
    setActivePage("Profile")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function toggleRegistration(id: number) {
    setRegistered((current) =>
      current.includes(id)
        ? current.filter((eventId) => eventId !== id)
        : [...current, id],
    )
  }

  function createEvent(draft: EventDraft) {
    setHostedEvents((current) => [
      {
        ...draft,
        id: Date.now(),
        seats: "Registration open",
        image: events[0].image,
        imageAlt: "People collaborating at a community event",
      },
      ...current,
    ])
    navigate("My Events")
  }

  let pageContent: ReactNode

  if (activePage === "Home") {
    pageContent = (
      <HomePage
        onNavigate={navigate}
        onOpenProfile={openProfile}
        registeredEvents={registeredEvents}
      />
    )
  } else if (activePage === "Discover") {
    pageContent = (
      <DiscoverPage
        onOpenProfile={openProfile}
        onToggleRegistration={toggleRegistration}
        registered={registered}
      />
    )
  } else if (activePage === "My Events") {
    pageContent = (
      <MyEventsPage
        hostedEvents={hostedEvents}
        onCreate={() => setActivePage("Create Event")}
        onDiscover={() => navigate("Discover")}
        onOpenProfile={openProfile}
        onRemove={toggleRegistration}
        registeredEvents={registeredEvents}
      />
    )
  } else if (activePage === "AI") {
    pageContent = <AIPage onOpenProfile={openProfile} />
  } else if (activePage === "Profile") {
    pageContent = <ProfilePage onBack={() => navigate(previousMainPage)} />
  } else {
    pageContent = (
      <CreateEventPage
        onBack={() => navigate("My Events")}
        onCreate={createEvent}
      />
    )
  }

  return (
    <main className="app-background min-h-dvh font-sans text-upay-navy">
      <div className="relative mx-auto min-h-dvh w-full max-w-7xl lg:flex lg:border-x lg:border-upay-blue/6 lg:bg-white/28">
        <div className="pointer-events-none absolute -left-24 top-64 size-60 rounded-full bg-upay-yellow/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-[46rem] size-72 rounded-full bg-upay-blue/12 blur-3xl" />
        <DesktopSidebar activePage={activePage} onChange={navigate} />
        <div className="relative flex min-h-dvh min-w-0 flex-1 flex-col">
          {pageContent}
        </div>
        <BottomNav activePage={activePage} onChange={navigate} />
      </div>
    </main>
  )
}
