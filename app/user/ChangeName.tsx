import { Button, Input } from '@nextui-org/react';
import { Profile, useUserState } from '../lib/context/UserContext';
import { useState } from 'react';
import { updateUserName } from '../lib/request/updateUserName';

function NameInput({ inputVal, setVal, saveName }: any) {
  return (
    <div className="flex items-center mt-1">
      <Input
        size="sm"
        value={inputVal}
        onChange={setVal}
        classNames={{ inputWrapper: 'h-10' }}
      />
      <Button
        onClick={() => saveName(inputVal)}
        className="ml-1 h-10"
        size="sm"
      >
        Save
      </Button>
    </div>
  );
}

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
