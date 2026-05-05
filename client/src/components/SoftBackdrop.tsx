const SoftBackdrop = () => {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <div className="absolute left-1/2 top-20 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-pink-800/35 to-transparent rounded-full blur-3xl" />
      
      <div className="absolute right-12 bottom-10 w-[300px] h-[200px] bg-gradient-to-bl from-red-700/35 to-transparent rounded-full blur-2xl" />
    </div>
  );
};

export default SoftBackdrop;