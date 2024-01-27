import { getGooguleOauthLink } from '@/requests';
import { Button, ButtonGroup } from '@nextui-org/react';
import { GoogleIcon } from '../components/icons/Google';
import { GithubIcon } from '../components/icons/Github';

export function OauthButtons() {
  const signWithGoogle = async () => {
    const { link } = await getGooguleOauthLink();
    window.location.href = link;
  };
  return (
    <div className="mt-1 mb-6 flex flex-col lg:flex-row items-center justify-between">
      <div className="w-full lg:w-1/2 mb-2 lg:mb-0">
        <ButtonGroup variant="bordered">
          <Button
            type="button"
            onClick={signWithGoogle}
            startContent={<GoogleIcon />}
          >
            Sign Up with Google
          </Button>
          <Button type="button" startContent={<GithubIcon />}>
            Sign Up with Github
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}
