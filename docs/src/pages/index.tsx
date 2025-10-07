import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import CodeBlock from '@theme/CodeBlock';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Get Started NOW!
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="This is the documentation for Peaque Framework, a modern web framework for building fullstack applications with TypeScript and React.">
      <HomepageHeader />
      <main>
        <section className="container" style={{marginTop: '2rem'}}>
          <h2>Install Peaque Framework</h2>
          <Tabs>
            <TabItem value="npm" label="NPM">
              <CodeBlock language="bash">npm create @peaque/framework@latest</CodeBlock>
            </TabItem>
            <TabItem value="yarn" label="Yarn">
              <CodeBlock language="bash">yarn create @peaque/framework</CodeBlock>
            </TabItem>
            <TabItem value="pnpm" label="PNPM">
              <CodeBlock language="bash">pnpm create @peaque/framework</CodeBlock>
            </TabItem>
          </Tabs>
        </section>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
