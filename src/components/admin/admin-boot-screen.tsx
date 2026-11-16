export function AdminBootScreen() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[1560px] flex-col px-4 py-6 md:px-6">
      <div aria-hidden="true" className="flex items-center justify-between border-b border-line pb-5">
        <span className="h-3 w-40 bg-surface" />
        <span className="h-3 w-24 bg-surface" />
      </div>
      <div aria-hidden="true" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className="h-24 border border-line bg-surface" />
        ))}
      </div>
      <div aria-hidden="true" className="mt-6 grid flex-1 grid-cols-7 gap-px border border-line bg-line">
        {Array.from({ length: 35 }, (_, index) => (
          <span key={index} className="min-h-20 bg-bg" />
        ))}
      </div>
      <p className="sr-only" role="status">
        Проверяем сессию
      </p>
    </main>
  );
}
