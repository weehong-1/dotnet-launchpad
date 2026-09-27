import React, {type ReactNode} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import {useLocale} from '@site/src/lib/i18n';
import {PHASES, pick, STEPS} from '@site/src/data/steps';
import styles from './index.module.css';

function Arrow(): ReactNode {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function Home(): ReactNode {
  const locale = useLocale();
  return (
    <Layout
      title={translate({id: 'home.title', message: 'Set up a .NET project, step by step'})}
      description={translate({id: 'home.description', message: 'A step by step Setup Flow for a new .NET 10 Clean Architecture backend, with the full Boilerplate Reference.'})}>
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroMain}>
            <span className={`tag tag-accent ${styles.heroTag}`}>Boilerplate v1.0 · .NET 10</span>
            <h1 className={styles.title}>
              <Translate id="home.heading">Set up a new .NET backend, one step at a time</Translate>
            </h1>
            <p className={styles.lead}>
              <Translate id="home.lead">
                Follow the Setup Flow from an empty folder to a deployed Skeleton Solution: Clean Architecture, Vertical Slice, DDD and CQRS on .NET 10. Name your project once and every command and file on the site uses it.
              </Translate>
            </p>
            <div className={styles.actions}>
              <Link className={`btn btn-primary btn-lg ${styles.start}`} to="/docs/setup">
                <Translate id="home.start">Start the Setup Flow</Translate>
                <Arrow />
              </Link>
              <Link className="btn btn-secondary btn-lg" to="/docs/reference">
                <Translate id="home.reference">Browse the Reference</Translate>
              </Link>
            </div>
          </div>
          <div className={styles.heroSide}>
            <div className="kicker">
              <Translate id="home.statusLabel">Status</Translate>
            </div>
            <p>
              <Translate id="home.status">Boilerplate v1.0 · The Skeleton Solution builds and its tests pass (verified with the scaffold script). Deployment to a VM is not yet verified.</Translate>
            </p>
          </div>
        </section>

        <div className={styles.phasesHead}>
          <h2>
            <Translate id="home.phases">The Setup Flow</Translate>
          </h2>
          <span className="text-muted">
            {translate({id: 'home.count', message: '{steps} steps · {phases} phases'}, {steps: STEPS.length, phases: PHASES.length})}
          </span>
        </div>
        <ol className={styles.phases}>
          {PHASES.map((phase) => (
            <li key={phase.id} className={styles.phase}>
              <div className={styles.phaseHead}>
                <span className={styles.phaseNum}>{phase.num}</span>
                <h3>{pick(phase.title, locale)}</h3>
              </div>
              <div className={styles.steps}>
                {phase.steps.map((s) => (
                  <Link key={s.id} to={`/docs/setup/${s.id}`} className={styles.step}>
                    <span className={styles.stepNum}>{s.num}</span>
                    <span>{pick(s.title, locale)}</span>
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </main>
    </Layout>
  );
}
