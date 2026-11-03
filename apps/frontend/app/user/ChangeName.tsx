import { Button } from '@heroui/react';
import { useUserState } from '../lib/context/UserContext';
import { type Profile } from '../lib/types';
import { useState } from 'react';
import { updateUserName } from '@/requests';
import { NameInput } from './NameInput';

export default function ChangeName({ profile }: { profile: Profile }) {
  const [active, setStatus] = useState(false);
  const { updateUser } = useUserState();
  const [inputVal, setVal] = useState(profile.name);

  const inputCntrl = (e: any) => {
    setVal(e.target.value);
  };
  const saveUserName = async (newName: string) => {
    await updateUserName(newName);
    updateUser({ ...profile, name: newName });
  };

  return profile.isAuthorized ? (
    <div className="w-full mb-2">
      <Button size="sm" className="w-full" onClick={() => setStatus(!active)}>
        Change name
      </Button>
      {active ? (
        <NameInput
          saveName={saveUserName}
          inputVal={inputVal}
          setVal={inputCntrl}
        />
      ) : null}
    </div>
  ) : null;
}
