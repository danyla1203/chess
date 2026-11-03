import { Dots } from './Icons';
import { SignupForm } from './SignupForm';

export default function CompleteSignup() {
  return (
    <div className="relative bg-gray-950 lg:py-20 h-[calc(100vh-69px)]">
      <div
        className="flex flex-col items-center justify-between pr-10 pl-10 mr-auto ml-auto max-w-7xl
      xl:px-5 lg:flex-row"
      >
        <div className="flex flex-col items-center w-full pt-5 pr-10 pb-20 pl-10 lg:pt-20 lg:flex-row">
          <div className="hidden lg:block w-full bg-cover relative max-w-md lg:max-w-2xl lg:w-7/12">
            <div className="flex flex-col items-center justify-center w-full h-full relative lg:pr-10">
              <h1 className="text-[350px] select-none cursor-default">👾</h1>
            </div>
          </div>
          <div className="w-full mt-20 mr-0 mb-0 ml-0 relative z-10 max-w-2xl lg:mt-0 lg:w-5/12">
            <SignupForm />
            <Dots />
          </div>
        </div>
      </div>
    </div>
  );
}
