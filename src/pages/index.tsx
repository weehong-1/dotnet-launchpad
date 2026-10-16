import React, {type ReactNode} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import {useLocale} from '@site/src/lib/i18n';
import {ADDON_PHASES, CORE_PHASES, pick} from '@site/src/data/steps';
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
      description={translate({id: 'home.description', message: 'A step by step Setup Flow for a new .NET 10 backend with Clean Architecture, DDD and CQRS, then add-ons for PostgreSQL, messaging and going live.'})}>
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroMain}>
            <span className={`tag tag-accent ${styles.heroTag}`}>Boilerplate v2.0 · .NET 10</span>
            <h1 className={styles.title}>
              <Translate id="home.heading">Set up a new .NET backend, one step at a time</Translate>
            </h1>
            <p className={styles.lead}>
              <Translate id="home.lead.v2">
                Follow the Setup Flow from an empty folder to a running Skeleton Solution: Clean Architecture, DDD and CQRS on .NET 10, with no database or broker to set up first. Then add only what the project needs: PostgreSQL, messaging with RabbitMQ and MassTransit, a Worker, auditing, sign in, and going live. Name your project once and every command and file on the site uses it.
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
              <Translate id="home.status.v2">Boilerplate v2.0 · The core Skeleton Solution and every add-on combination build with zero warnings, and the core tests pass with no Docker (verified with the scaffold script). Deployment to a VM is not yet verified.</Translate>
            </p>
          </div>
        </section>

        <div className={styles.phasesHead}>
          <h2>
            <Translate id="home.phases">The Setup Flow</Translate>
          </h2>
          <span className="text-muted">
            {translate({id: 'home.count', message: '{steps} steps · {phases} phases'}, {steps: CORE_PHASES.flatMap((p) => p.steps).length, phases: CORE_PHASES.length})}
          </span>
        </div>
        <ol className={styles.phases}>
          {CORE_PHASES.map((phase) => (
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

        <div className={styles.phasesHead}>
          <h2>
            <Link to="/docs/setup/addons">
              <Translate id="home.addons">Add-ons, after the Setup Flow</Translate>
            </Link>
          </h2>
          <span className="text-muted">
            <Translate id="home.addonsHint">Each one is optional; add only what the project needs</Translate>
          </span>
        </div>
        <ol className={styles.phases}>
          {ADDON_PHASES.map((phase) => (
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
