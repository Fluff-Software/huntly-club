import React, { useState } from "react";
import { Modal, Platform, Text, View } from "react-native";
import { FKButton } from "@/components/fieldkit";
import { DialogCard, dialogStyles } from "@/components/account/GrownUpRows";
import {
  declinePushFromPrompt,
  enablePushFromPrompt,
  type PushOptInResult,
} from "@/services/pushOptInPrompt";

type Phase = "ask" | "working" | "declined" | "failed";

const HOW_TO_ENABLE_IN_APP = "Me → Settings → Notifications";
const HOW_TO_ENABLE_ON_PHONE =
  Platform.OS === "ios"
    ? "your iPhone's Settings → Huntly World → Notifications"
    : "your phone's Settings → Apps → Huntly World → Notifications";

/** One-time ask for families who don't have notifications on. */
export function PushOptInModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("ask");

  const close = () => {
    setPhase("ask");
    onClose();
  };

  const handleYes = async () => {
    setPhase("working");
    const result: PushOptInResult = await enablePushFromPrompt();
    if (result === "enabled" || result === "opened_settings") close();
    else setPhase(result === "declined" ? "declined" : "failed");
  };

  const handleNotNow = async () => {
    await declinePushFromPrompt();
    setPhase("declined");
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={phase === "ask" ? handleNotNow : close}>
      <View style={dialogStyles.overlay}>
        <DialogCard>
          {phase === "declined" || phase === "failed" ? (
            <>
              <Text style={dialogStyles.title}>
                {phase === "declined" ? "No problem" : "We couldn't turn them on just now"}
              </Text>
              <Text style={dialogStyles.body}>
                You can turn notifications on any time in the app: {HOW_TO_ENABLE_IN_APP}.
              </Text>
              <Text style={dialogStyles.body}>
                If that doesn't work, turn them on in {HOW_TO_ENABLE_ON_PHONE}.
              </Text>
              <View style={dialogStyles.actions}>
                <FKButton label="Got it" icon={null} onPress={close} testID="push-optin-got-it" />
              </View>
            </>
          ) : (
            <>
              <Text style={dialogStyles.title}>Turn on notifications?</Text>
              <Text style={dialogStyles.body}>
                We'll let you know when new missions and chapters arrive, plus the odd bit of club news.
              </Text>
              <View style={dialogStyles.actions}>
                <FKButton
                  label="Yes, turn them on"
                  icon="notifications"
                  onPress={() => void handleYes()}
                  loading={phase === "working"}
                  testID="push-optin-yes"
                />
                <FKButton
                  label="Not now"
                  variant="link"
                  onPress={() => void handleNotNow()}
                  disabled={phase === "working"}
                  testID="push-optin-not-now"
                />
              </View>
            </>
          )}
        </DialogCard>
      </View>
    </Modal>
  );
}
