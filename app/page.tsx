import Header from "@/components/UI/Header";
import MainLayout from "@/components/UI/MainLayout";

export default function Home() {
  return (
    <>
      <div className="relative flex flex-col min-h-screen w-full bg-gradient-to-b from-white to-zinc-100">
        <Header/>
        <div className="mt-24 mb-5">
          <MainLayout/>
        </div>
      </div>
    </>
  );
}
