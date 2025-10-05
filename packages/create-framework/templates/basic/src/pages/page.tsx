import * as React from 'react';
export default function Page() {
  const [data, setData] = React.useState(null)
  fetch('/api/hello').then(res => res.json()).then(j => setData(j.message))
  return (
    <div className='mx-auto w-xl'>
      <img src="/peaque.png" alt="Peaque Logo" className="w-32 h-32 mt-4" />
      <div className="text-gray-300 text-xl">Page</div>
      {data && <div className="mt-4 text-green-400">Message from API: {data}</div>}
    </div>
  )
}
