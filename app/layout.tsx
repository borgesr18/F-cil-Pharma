export const metadata = { title: 'Fácil Pharma - Sistema de Gestão Hospitalar' };
export default function RootLayout({ children }:{children:React.ReactNode}) {
  return (
    <html lang="pt-br">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
