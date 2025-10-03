export default function Header() {
    return (
        <header className="fixed top-0 w-full h-16 flex items-center justify-between px-8 shadow-md bg-white z-50">
            <div>
                <h2 className="font-extrabold text-xl text-yellow-500 tracking-wider webkit-logo drop-shadow-[2px_2px_0px_rgba(149,98,0,1)] transition-all ease-in-out duration-400 hover:cursor-pointer">COMPRESSOR</h2>
            </div>
            <div>
                <button className="px-2 py-1 rounded-xs bg-yellow-100 shadow-sm  font-semibold text-yellow-800 hover:bg-orange-400 hover:text-white duration-200 ease-in transition-colors">LOGIN</button>
            </div>
        </header>
    );
}