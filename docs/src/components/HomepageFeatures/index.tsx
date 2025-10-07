import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

// Custom SVG icons for Peaque features
const ZeroConfigIcon = (props: React.ComponentProps<'svg'>) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
  </svg>
);

const FileRoutingIcon = (props: React.ComponentProps<'svg'>) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TailwindIcon = (props: React.ComponentProps<'svg'>) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 6C8 6 4 7.5 4 9.5C4 10.5 6 11.5 8 12C6 12.5 4 13.5 4 14.5C4 16.5 8 18 12 18C16 18 20 16.5 20 14.5C20 13.5 18 12.5 16 12C18 11.5 20 10.5 20 9.5C20 7.5 16 6 12 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="9" r="1" fill="currentColor"/>
    <circle cx="15" cy="15" r="1" fill="currentColor"/>
  </svg>
);

const FeatureList: FeatureItem[] = [
  {
    title: 'Zero Configuration',
    Svg: ZeroConfigIcon,
    description: (
      <>
        Peaque was designed from the ground up to be easily installed and
        used to get your full-stack app up and running quickly with zero config.
      </>
    ),
  },
  {
    title: 'File-Based Routing',
    Svg: FileRoutingIcon,
    description: (
      <>
        Focus on building your app, and let Peaque handle routing. Simply create
        files in your <code>src/pages</code> directory and routes are automatically generated.
      </>
    ),
  },
  {
    title: 'Built-in Tailwind CSS',
    Svg: TailwindIcon,
    description: (
      <>
        Extend or customize your app with Tailwind CSS 4 built-in. Peaque includes
        Hot Module Replacement for instant styling updates during development.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
