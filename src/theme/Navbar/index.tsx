import React, {type ReactNode} from 'react';
import Navbar from '@theme-original/Navbar';
import type NavbarType from '@theme/Navbar';
import type {WrapperProps} from '@docusaurus/types';
import ActiveProjectBar from '@site/src/components/ActiveProjectBar';

type Props = WrapperProps<typeof NavbarType>;

// The active project strip runs full width under the header on every page.
export default function NavbarWrapper(props: Props): ReactNode {
  return (
    <>
      <Navbar {...props} />
      <ActiveProjectBar />
    </>
  );
}
