export default function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-[#232632] bg-[#0B0B0B]">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-[#A6A6A6]">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 justify-between">
          <div>
            <div className="text-white font-medium">AI Sports Guru</div>
            <div className="text-xs mt-1">For entertainment & research. Gamble responsibly.</div>
          </div>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/responsible" className="hover:text-white">Responsible Play</a>
            <a href="/terms" className="hover:text-white">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
