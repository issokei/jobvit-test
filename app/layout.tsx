import { Analytics } from "@vercel/analytics/react";

export const metadata = {
  title: "インターンEXPO LINE Bot",
  description: "インターンEXPO公式LINE Bot",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
