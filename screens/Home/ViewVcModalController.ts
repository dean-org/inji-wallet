import {useMachine, useSelector} from '@xstate/react';
import {useContext, useEffect, useState, useMemo} from 'react';
import {ActorRefFrom} from 'xstate';
import {useTranslation} from 'react-i18next';
import NetInfo from '@react-native-community/netinfo';
import {ModalProps} from '../../components/ui/Modal';
import {GlobalContext} from '../../shared/GlobalContext';
import {
  selectOtpError,
  selectWalletBindingError,
  selectEmptyWalletBindingId,
  selectShowWalletBindingError,
  selectWalletBindingSuccess,
  selectBindingAuthFailedError,
  selectAcceptingBindingOtp,
  selectWalletBindingInProgress,
  selectBindingWarning,
} from '../../machines/VCItemMachine/commonSelectors';
import {
  selectIsAcceptingOtpInput,
  selectIsAcceptingRevokeInput,
  selectIsLockingVc,
  selectIsRevokingVc,
  selectIsLoggingRevoke,
  selectVc as selectExistingMosipVc,
  ExistingMosipVCItemEvents,
  ExistingMosipVCItemMachine,
  selectRequestBindingOtp,
} from '../../machines/VCItemMachine/ExistingMosipVCItem/ExistingMosipVCItemMachine';
import {
  EsignetMosipVCItemEvents,
  EsignetMosipVCItemMachine,
} from '../../machines/VCItemMachine/EsignetMosipVCItem/EsignetMosipVCItemMachine';
import {selectVerifiableCredential} from '../../machines/VCItemMachine/EsignetMosipVCItem/EsignetMosipVCItemMachine';
import {selectPasscode} from '../../machines/auth';
import {biometricsMachine, selectIsSuccess} from '../../machines/biometrics';

export function useViewVcModal({
  vcItemActor,
  isVisible,
  onRevokeDelete,
}: ViewVcModalProps) {
  const {t} = useTranslation('ViewVcModal');
  const [toastVisible, setToastVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [reAuthenticating, setReAuthenticating] = useState('');
  const [isRevoking, setRevoking] = useState(false);
  const [error, setError] = useState('');
  const {appService} = useContext(GlobalContext);
  const authService = appService.children.get('auth');
  const [, bioSend, bioService] = useMachine(biometricsMachine);

  // Determine if the VC is from Esignet (OpenID4VCI) or ExistingMosip
  const isEsignetVC = useMemo(() => {
    try {
      const state = vcItemActor.getSnapshot();
      // Check if the machine ID is for OpenID4VCI (Esignet)
      return state?.machine?.id === 'vc-item-openid4vci';
    } catch {
      return false;
    }
  }, [vcItemActor]);

  const isSuccessBio = useSelector(bioService, selectIsSuccess);
  const isLockingVc = useSelector(vcItemActor, selectIsLockingVc);
  const isRevokingVc = useSelector(vcItemActor, selectIsRevokingVc);
  const isLoggingRevoke = useSelector(vcItemActor, selectIsLoggingRevoke);
  
  // Use appropriate selector based on VC type
  const vc = useSelector(vcItemActor, isEsignetVC 
    ? (state: any) => ({ 
        verifiableCredential: state.context.verifiableCredential,
        id: state.context.vcMetadata?.id,
        locked: false
      })
    : selectExistingMosipVc
  );
  const otError = useSelector(vcItemActor, selectOtpError);
  const onSuccess = () => {
    bioSend({type: 'SET_IS_AVAILABLE', data: true});
    setError('');
    setReAuthenticating('');
    // LOCK_VC is only available for ExistingMosip VCs
    if (!isEsignetVC) {
      vcItemActor.send(ExistingMosipVCItemEvents.LOCK_VC());
    }
  };

  const onError = (value: string) => {
    setError(value);
  };

  const showToast = (message: string) => {
    setToastVisible(true);
    setMessage(message);
    setTimeout(() => {
      setToastVisible(false);
      setMessage('');
    }, 3000);
  };

  const netInfoFetch = (otp: string) => {
    NetInfo.fetch().then(state => {
      if (state.isConnected) {
        // INPUT_OTP is only available for ExistingMosip VCs
        if (!isEsignetVC) {
          vcItemActor.send(ExistingMosipVCItemEvents.INPUT_OTP(otp));
        }
      } else {
        if (isEsignetVC) {
          vcItemActor.send(EsignetMosipVCItemEvents.DISMISS());
        } else {
          vcItemActor.send(ExistingMosipVCItemEvents.DISMISS());
        }
        showToast('Request network failed');
      }
    });
  };

  useEffect(() => {
    // Only show lock/unlock/revoke toasts for Existing Mosip VCs (not Esignet)
    if (!isEsignetVC) {
      if (isLockingVc && vc) {
        showToast(vc.locked ? t('success.locked') : t('success.unlocked'));
      }
      if (isRevokingVc && vc) {
        showToast(t('success.revoked', {vid: vc.id}));
      }
    }
    if (isLoggingRevoke) {
      if (isEsignetVC) {
        vcItemActor.send(EsignetMosipVCItemEvents.DISMISS());
      } else {
        vcItemActor.send(ExistingMosipVCItemEvents.DISMISS());
      }
      onRevokeDelete();
    }
    if (isSuccessBio && reAuthenticating != '') {
      onSuccess();
    }
  }, [
    reAuthenticating,
    isLockingVc,
    isSuccessBio,
    otError,
    isRevokingVc,
    isLoggingRevoke,
    vc,
    isEsignetVC,
  ]);

  useEffect(() => {
    // Send appropriate REFRESH event based on VC type
    if (isEsignetVC) {
      vcItemActor.send(EsignetMosipVCItemEvents.REFRESH());
    } else {
      vcItemActor.send(ExistingMosipVCItemEvents.REFRESH());
    }
  }, [isVisible, isEsignetVC]);
  return {
    error,
    message,
    toastVisible,
    vc,
    otpError: useSelector(vcItemActor, selectOtpError),
    bindingAuthFailedError: useSelector(
      vcItemActor,
      selectBindingAuthFailedError,
    ),
    reAuthenticating,
    isRevoking,

    isLockingVc,
    isAcceptingOtpInput: useSelector(vcItemActor, selectIsAcceptingOtpInput),
    isAcceptingRevokeInput: useSelector(
      vcItemActor,
      selectIsAcceptingRevokeInput,
    ),
    storedPasscode: useSelector(authService, selectPasscode),
    isBindingOtp: useSelector(vcItemActor, selectRequestBindingOtp),
    isAcceptingBindingOtp: useSelector(vcItemActor, selectAcceptingBindingOtp),
    walletBindingError: useSelector(vcItemActor, selectWalletBindingError),
    isWalletBindingPending: useSelector(
      vcItemActor,
      selectEmptyWalletBindingId,
    ),
    isWalletBindingInProgress: useSelector(
      vcItemActor,
      selectWalletBindingInProgress,
    ),
    isBindingError: useSelector(vcItemActor, selectShowWalletBindingError),
    isBindingSuccess: useSelector(vcItemActor, selectWalletBindingSuccess),
    isBindingWarning: useSelector(vcItemActor, selectBindingWarning),

    CONFIRM_REVOKE_VC: () => {
      // REVOKE_VC is only available for ExistingMosip VCs
      if (!isEsignetVC) {
        setRevoking(true);
      }
    },
    REVOKE_VC: () => {
      // REVOKE_VC is only available for ExistingMosip VCs
      if (!isEsignetVC) {
        vcItemActor.send(ExistingMosipVCItemEvents.REVOKE_VC());
      }
      setRevoking(false);
    },
    setReAuthenticating,
    setRevoking,
    onError,
    addtoWallet: () => {
      if (isEsignetVC) {
        vcItemActor.send(EsignetMosipVCItemEvents.ADD_WALLET_BINDING_ID());
      } else {
        vcItemActor.send(ExistingMosipVCItemEvents.ADD_WALLET_BINDING_ID());
      }
    },
    lockVc: () => {
      // LOCK_VC is only available for ExistingMosip VCs
      if (!isEsignetVC) {
        vcItemActor.send(ExistingMosipVCItemEvents.LOCK_VC());
      }
    },
    inputOtp: (otp: string) => {
      // INPUT_OTP is only available for ExistingMosip VCs
      if (!isEsignetVC) {
        netInfoFetch(otp);
      }
    },
    revokeVc: (otp: string) => {
      // REVOKE_VC is only available for ExistingMosip VCs
      if (!isEsignetVC) {
        netInfoFetch(otp);
      }
    },
    ADD_WALLET: () => {
      if (isEsignetVC) {
        vcItemActor.send(EsignetMosipVCItemEvents.ADD_WALLET_BINDING_ID());
      } else {
        vcItemActor.send(ExistingMosipVCItemEvents.ADD_WALLET_BINDING_ID());
      }
    },
    onSuccess,
    DISMISS: () => {
      if (isEsignetVC) {
        vcItemActor.send(EsignetMosipVCItemEvents.DISMISS());
      } else {
        vcItemActor.send(ExistingMosipVCItemEvents.DISMISS());
      }
    },
    LOCK_VC: () => {
      // LOCK_VC is only available for ExistingMosip VCs
      if (!isEsignetVC) {
        vcItemActor.send(ExistingMosipVCItemEvents.LOCK_VC());
      }
    },
    INPUT_OTP: (otp: string) => {
      // INPUT_OTP is only available for ExistingMosip VCs
      if (!isEsignetVC) {
        vcItemActor.send(ExistingMosipVCItemEvents.INPUT_OTP(otp));
      }
    },
    RESEND_OTP: () => {
      // RESEND_OTP is only available for ExistingMosip VCs
      if (!isEsignetVC) {
        vcItemActor.send(ExistingMosipVCItemEvents.RESEND_OTP());
      }
    },
    CANCEL: () => {
      if (isEsignetVC) {
        vcItemActor.send(EsignetMosipVCItemEvents.CANCEL());
      } else {
        vcItemActor.send(ExistingMosipVCItemEvents.CANCEL());
      }
    },
    CONFIRM: () => {
      if (isEsignetVC) {
        vcItemActor.send(EsignetMosipVCItemEvents.CONFIRM());
      } else {
        vcItemActor.send(ExistingMosipVCItemEvents.CONFIRM());
      }
    },
  };
}

export interface ViewVcModalProps extends ModalProps {
  vcItemActor: ActorRefFrom<typeof ExistingMosipVCItemMachine> | ActorRefFrom<typeof EsignetMosipVCItemMachine>;
  onDismiss: () => void;
  onRevokeDelete: () => void;
  activeTab: Number;
}
