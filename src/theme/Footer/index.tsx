import React, {type ReactNode} from 'react';
import styles from './styles.module.css';

export default function Footer(): ReactNode {
  return (
    <footer className={`${styles.footer} text-muted`}>
      <span>.NET Launchpad · Boilerplate v1.0</span>
      <span>English · 简体中文</span>
    </footer>
  );
}
