import { Breadcrumbs, Image } from '@mantine/core';
import Link from 'next/link';

const items = [
  { title: 'Home', href: '', icon: 'home' },
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Path', href: '/dashboard/teams' },
].map((item, index) => (
  <Link href={item.href} key={index}>
    {item.icon === 'home' ? (
      <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/icons/home.svg`} alt="home icon" width={15} height={15} />
    ) : (
      item.title
    )}
  </Link>
));

export function Navbar() {
  return (
    <>
      <Breadcrumbs
        separator={
          <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/icons/right-arrow.svg`} alt="arrow icon" width={6} height={12} />
        }
        mt="xs"
      >
        {items}
      </Breadcrumbs>
    </>
  );
}
