import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const FeatureList = [
  {
    icon: '🏗️',
    title: 'Composable Architecture',
    description: (
      <>
        Mix and match building blocks for custom solutions.
      </>
    ),
  },
  {
    icon: '💼',
    title: 'Real-World Use Cases',
    description: (
      <>
        Solve real business problems with industry-specific implementations.
      </>
    ),
  },
  {
    icon: '🚀',
    title: 'Accelerated Development',
    description: (
      <>
        Deploy end-to-end well-architected solutions in minutes.
      </>
    ),
  },
  {
    icon: '🔒',
    title: 'Enterprise-Grade by Default',
    description: (
      <>
        Built-in security, monitoring, and well-architected best practices.
      </>
    ),
  },
];

function Feature({icon, title, description}) {
  return (
    <div className={clsx('col col--6', styles.featureCard)}>
      <div className="text--center padding-horiz--md">
        <div className={styles.featureIcon}>{icon}</div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/">
            Get Started
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://constructs.dev/packages/@cdklabs/cdk-appmod-catalog-blueprints/"
            style={{marginLeft: '1rem'}}>
            API Reference
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Develop customizable well-architected applications on AWS in minutes">
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              {FeatureList.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
