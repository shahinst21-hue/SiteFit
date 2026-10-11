import {
  LocationIcon, Profile2Icon, ShopIcon, ShieldIcon, DocumentIcon,
  MoneyIcon, CoffeeIcon, SearchIcon, CheckIcon, ClockIcon, ChartIcon,
  LeafIcon, MenuIcon, CloseIcon, ArrowRightIcon, ArrowUpRightIcon,
  ArrowDownIcon, ArrowLeftIcon, Login2Icon, Logout2Icon, EmailIcon,
  MessageQuestionIcon, HouseIcon,
  ArrowUpIcon, AddIcon, MinusIcon, RotateArrowIcon,
} from "@astraicons/react/linear";

// Shared SiteFit roles. The installed set has no dining, rail or scissors glyph;
// use neutral roles beside explicit labels rather than unrelated pictograms.
const icons = {
  pin: LocationIcon, demand: Profile2Icon, shop: ShopIcon,
  access: LocationIcon, shield: ShieldIcon, document: DocumentIcon,
  cost: MoneyIcon, coffee: CoffeeIcon, restaurant: ShopIcon,
  hair: Profile2Icon, beauty: LeafIcon, search: SearchIcon,
  check: CheckIcon, clock: ClockIcon, evidence: ChartIcon,
  menu: MenuIcon, close: CloseIcon, arrow: ArrowRightIcon,
  external: ArrowUpRightIcon, down: ArrowDownIcon, back: ArrowLeftIcon,
  account: Profile2Icon, login: Login2Icon, logout: Logout2Icon,
  email: EmailIcon, help: MessageQuestionIcon, home: HouseIcon,
  up: ArrowUpIcon, add: AddIcon, minus: MinusIcon, reset: RotateArrowIcon,
};
export type IconName = keyof typeof icons;
export function Icon({name, className = ""}: {name: IconName; className?: string}) {
  const Drawing = icons[name];
  return <Drawing className={`icon ${className}`} width={24} height={24} aria-hidden="true" focusable="false" />;
}
