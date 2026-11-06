import { Toast } from "@/components/common/Notice";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
} from "react-native";
import { ChevronDown, Search, Check } from "lucide-react-native";
import useTemplatesAvailableForTeam from "./templates/team";
import { useTeamsByUser } from "@/api/teams/teams.query";
import { useSendWaTemplateToUser } from "@/api/whatsapp/template/whatsapp.query";
import { WaInboxTemplate } from "./templates/TemplateComponents";
import { AccountSelector } from "./templates/TemplateComponents";
import { getContactById } from "@/api/inbox/contacts/contacts.api";
import { Colors } from "@/constants/colors";

const TemplateSending = ({ onClose, contact }: { onClose: any; contact: any }) => {
  // Never written: the template body params aren't editable from the phone yet,
  // so this stays the empty array the send call expects.
  const [parameterData] = useState([]);
  const [contactDetails, setContactDetails] = useState<any>(null);
  const [teamId, setTeamId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedTeamName, setSelectedTeamName] = useState<string>("");
  const [loadingContact, setLoadingContact] = useState(true);
  const [sending, setSending] = useState(false);
  const [whatsappSettingsPhoneId, setWhatsappSettingsPhoneId] = useState<string>("");

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const teams = useTeamsByUser();
  const templatesAvailableForTeam = useTemplatesAvailableForTeam(teamId);

  const sendTemplate = useSendWaTemplateToUser(contactDetails?.phone, contactDetails?.id);

  useEffect(() => {
    async function getContactDetails() {
      setLoadingContact(true);
      try {
        const detail = await getContactById(contact);
        setContactDetails(detail);
      } catch {
        Toast.show({
          type: "error",
          text1: "Contacts fetching failed",
        });
      } finally {
        setLoadingContact(false);
      }
    }
    getContactDetails();
  }, [contact]);

  // A 300ms spinner while the list re-filters, so the results don't jump under the thumb
  // mid-type. Expressed as "the settled inputs are behind the current ones" rather than a
  // flag raised from the effect: the flag needed a synchronous set on every keystroke,
  // which is a second render per character on a screen already filtering a long list.
  const templatesKey = `${teamId}|${searchTerm}`;
  const [settledKey, setSettledKey] = useState(templatesKey);
  const loadingTemplates = settledKey !== templatesKey;

  useEffect(() => {
    if (settledKey === templatesKey) return;
    const timeout = setTimeout(() => setSettledKey(templatesKey), 300);
    return () => clearTimeout(timeout);
  }, [templatesKey, settledKey]);

  const approvedTemplates = templatesAvailableForTeam?.filter(
    (template) => template?.data?.status === "APPROVED",
  );

  const filteredTemplates = approvedTemplates?.filter((template) =>
    template.data.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const hasTemplates = filteredTemplates?.some((data) => data.id === selectedTemplateId);

  const selectedTemplate = filteredTemplates?.find(
    (template) => template.id === selectedTemplateId,
  );

  async function handleSendTemplate() {
    setSending(true);
    try {
      await sendTemplate?.mutateAsync({
        templateId: selectedTemplateId,
        parameterData: parameterData,
        teamId: teamId,
        whatsappSettingsPhoneId: whatsappSettingsPhoneId,
      });
      onClose(); // Close modal after send
    } catch {
      Toast.show({
        type: "error",
        text1: "Error in template sending",
      });
    } finally {
      setSending(false);
    }
  }

  if (loadingContact || teams.isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg,
          paddingVertical: 40,
        }}
      >
        <ActivityIndicator size="large" color={Colors.brand.blue} />
        <Text
          style={{
            fontFamily: "InstrumentSans_600SemiBold",
            color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary,
            marginTop: 10,
          }}
        >
          Loading contact and teams...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingVertical: 10 }}>
      {/* Team selector */}
      <View style={{ marginBottom: 14 }}>
        <Text
          style={{
            fontFamily: "InstrumentSans_600SemiBold",
            color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary,
            fontSize: 14,
            marginBottom: 6,
          }}
        >
          Select Team
        </Text>
        <Pressable
          disabled={teams.isLoading}
          style={{
            height: 42,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDark ? Colors.dark.borderLight : Colors.light.border,
            backgroundColor: isDark ? Colors.dark.surface : "#fff",
            paddingHorizontal: 12,
          }}
          onPress={() => setDropdownVisible((prev) => !prev)}
        >
          <Text
            style={{
              fontFamily: "InstrumentSans_600SemiBold",
              fontSize: 14,
              color: selectedTeamName
                ? isDark
                  ? "#fff"
                  : Colors.light.textPrimary
                : isDark
                  ? Colors.dark.textPlaceholder
                  : Colors.light.textPlaceholder,
            }}
          >
            {selectedTeamName || "Select a team"}
          </Text>
          <ChevronDown size={16} color={isDark ? Colors.dark.inactive : Colors.light.inactive} />
        </Pressable>

        <Modal
          transparent
          animationType="fade"
          visible={dropdownVisible}
          onRequestClose={() => setDropdownVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.4)",
                paddingHorizontal: 20,
              }}
            >
              <View
                style={{
                  backgroundColor: isDark ? Colors.dark.surface : "#fff",
                  borderRadius: 16,
                  paddingVertical: 8,
                  maxHeight: "60%",
                  borderWidth: 1,
                  borderColor: isDark ? Colors.dark.borderLight : Colors.light.border,
                }}
              >
                <FlatList
                  data={teams.data?.data}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const isSelected = item.id === teamId;
                    return (
                      <Pressable
                        onPress={() => {
                          setTeamId(item.id);
                          setSelectedTeamName(item.name);
                          setDropdownVisible(false);
                          setSelectedTemplateId(""); // reset template on team change
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: isDark ? Colors.dark.border : Colors.light.border,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: isSelected
                              ? "InstrumentSans_700Bold"
                              : "InstrumentSans_600SemiBold",
                            fontSize: 15,
                            color: isSelected
                              ? isDark
                                ? Colors.accent.cyan
                                : Colors.brand.blue
                              : isDark
                                ? "#fff"
                                : Colors.light.textPrimary,
                          }}
                        >
                          {item.name}
                        </Text>
                        {isSelected && (
                          <Check
                            size={16}
                            color={isDark ? Colors.accent.cyan : Colors.brand.blue}
                          />
                        )}
                      </Pressable>
                    );
                  }}
                  ListEmptyComponent={
                    <Text
                      style={{
                        fontFamily: "InstrumentSans_600SemiBold",
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        color: isDark ? Colors.dark.textMuted : Colors.light.textMuted,
                        textAlign: "center",
                      }}
                    >
                      No teams found!
                    </Text>
                  }
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>

      {/* Account Selector */}
      <AccountSelector value={whatsappSettingsPhoneId} onChange={setWhatsappSettingsPhoneId} />

      {/* Search input */}
      {teamId && (
        <View style={{ marginBottom: 14 }}>
          <Text
            style={{
              fontFamily: "InstrumentSans_600SemiBold",
              color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary,
              fontSize: 14,
              marginBottom: 6,
            }}
          >
            Search Templates
          </Text>
          <View
            style={{
              height: 42,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: isDark ? Colors.dark.borderLight : Colors.light.border,
              backgroundColor: isDark ? Colors.dark.inputBg : Colors.light.inputBg,
              paddingHorizontal: 12,
            }}
          >
            <Search size={16} color={isDark ? Colors.dark.inactive : Colors.light.inactive} />
            <TextInput
              placeholder="Search templates..."
              placeholderTextColor={
                isDark ? Colors.dark.textPlaceholder : Colors.light.textPlaceholder
              }
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={{
                flex: 1,
                fontSize: 14,
                fontFamily: "InstrumentSans_400Regular",
                color: isDark ? "#fff" : Colors.light.textPrimary,
                padding: 0,
              }}
            />
          </View>
        </View>
      )}

      {/* Templates List */}
      {teamId && (
        <Text
          style={{
            fontFamily: "InstrumentSans_600SemiBold",
            color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary,
            fontSize: 14,
            marginBottom: 8,
          }}
        >
          Available Templates
        </Text>
      )}

      {loadingTemplates ? (
        <ActivityIndicator size="small" color={Colors.brand.blue} style={{ marginVertical: 10 }} />
      ) : filteredTemplates && filteredTemplates.length > 0 ? (
        <ScrollView style={{ maxHeight: 200, marginBottom: 14 }}>
          {filteredTemplates.map((template) => {
            const isSelected = selectedTemplateId === template.id;
            return (
              <Pressable
                key={template.id}
                onPress={() => setSelectedTemplateId(template.id)}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  marginBottom: 8,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: isSelected
                    ? isDark
                      ? Colors.accent.cyan
                      : Colors.brand.blue
                    : "transparent",
                  backgroundColor: isSelected
                    ? isDark
                      ? "rgba(79,195,255,0.15)"
                      : "rgba(28,81,142,0.08)"
                    : isDark
                      ? Colors.dark.surface
                      : Colors.light.surface,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "InstrumentSans_700Bold",
                      fontSize: 14,
                      color: isDark ? "#fff" : Colors.light.textPrimary,
                    }}
                  >
                    {template.data.name}
                  </Text>
                  {isSelected && (
                    <Check size={16} color={isDark ? Colors.accent.cyan : Colors.brand.blue} />
                  )}
                </View>
                <Text
                  style={{
                    fontFamily: "InstrumentSans_400Regular",
                    fontSize: 11,
                    color: isDark ? Colors.dark.textSubtle : Colors.light.textSubtle,
                    marginTop: 2,
                  }}
                >
                  Language: {template.data.language}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        teamId && (
          <Text
            style={{
              fontFamily: "InstrumentSans_400Regular_Italic",
              color: isDark ? Colors.dark.textMuted : Colors.light.textMuted,
              textAlign: "center",
              marginVertical: 12,
            }}
          >
            No approved templates found.
          </Text>
        )
      )}

      {/* Selected Template Preview */}
      {selectedTemplate && (
        <WaInboxTemplate
          parameters={parameterData}
          //@ts-ignore
          templateBody={selectedTemplate?.data}
        />
      )}

      {/* Send button */}
      {hasTemplates && (
        <Pressable
          style={{
            marginTop: 16,
            height: 46,
            borderRadius: 12,
            backgroundColor: Colors.brand.blue,
            alignItems: "center",
            justifyContent: "center",
            opacity: sending ? 0.7 : 1,
            shadowColor: Colors.brand.blue,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.4 : 0.2,
            shadowRadius: 8,
            elevation: 4,
          }}
          disabled={sending}
          onPress={handleSendTemplate}
        >
          {sending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text
              style={{
                fontFamily: "InstrumentSans_700Bold",
                fontSize: 15,
                color: "#fff",
              }}
            >
              Send Template
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
};

export default TemplateSending;
