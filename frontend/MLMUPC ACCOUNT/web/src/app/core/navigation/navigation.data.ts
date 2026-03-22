import { HelperNavigationItem } from 'helper/components/navigation';

const adminNavigation: HelperNavigationItem[] = [
    {
        id: 'home',
        type: 'basic',
        icon: 'mdi:home-outline',
        link: '/admin/dashboard',
    },
];
const userNavigation: HelperNavigationItem[] = [
    {
        id: 'home',
        type: 'basic',
        icon: 'mdi:home-outline',
        link: '/user/dashboard',
    },
];

export const navigationData = {
    admin: adminNavigation,
    user: userNavigation,
};
