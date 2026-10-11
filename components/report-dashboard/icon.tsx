import {
  LocationIcon, Profile2Icon, ShopIcon, ShieldIcon, DocumentIcon,
  MoneyIcon, CoffeeIcon, SearchIcon, CheckIcon, ClockIcon, ChartIcon,
  LeafIcon,
} from '@astraicons/react/linear';
import type {IconName} from '@/components/icon';

// Astra's linear set is scoped to the report workspace. Names are SiteFit roles,
// not provider identities; icons are decorative beside explicit text labels.
const icons = {
  pin: LocationIcon, demand: Profile2Icon, shop: ShopIcon,
  access: LocationIcon, shield: ShieldIcon, document: DocumentIcon,
  cost: MoneyIcon, coffee: CoffeeIcon, restaurant: ShopIcon,
  hair: Profile2Icon, beauty: LeafIcon, search: SearchIcon,
  check: CheckIcon, clock: ClockIcon, evidence: ChartIcon,
} satisfies Record<IconName, typeof LocationIcon>;

export function Icon({name,className=''}:{name:IconName;className?:string}) {
  const Drawing = icons[name];
  return <Drawing className={`icon ${className}`} width={24} height={24} aria-hidden="true" focusable="false"/>;
}
