export default function Loading(){
    return(
    <div className="flex h-screen flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
      <p className="text-sm text-slate-500">Loading...</p>
    </div>
    )
}