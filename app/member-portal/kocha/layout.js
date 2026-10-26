export const metadata = {
  title: 'Kocha Mwenzangu',
  description: 'The Coach Resource Hub for Kocha Mwenzangu coaches: weekly files, videos and homework.',
  // Private to signed-in coaches: never indexed, never followed.
  robots: { index: false, follow: false },
};

export default function KochaLayout({ children }) {
  return children;
}
