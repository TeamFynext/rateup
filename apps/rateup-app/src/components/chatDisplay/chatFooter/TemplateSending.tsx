import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import useTemplatesAvailableForTeam from "./templates/team";
import { useTeamsByUser } from "@/src/api/teams/teams.query";
import { useSendWaTemplateToUser } from "@/src/api/whatsapp/template/whatsapp.query";
import { WaInboxTemplate } from "../chatBody/messageBubbleTypes";
import { AccountSelector } from "./templates/TemplateComponents";
import { getContactById } from "@/src/api/inbox/contacts/contacts.api";
import { useToast } from "react-native-toast-notifications";

const TemplateSending = ({
  onClose,
  contact,
}: {
  onClose: any;
  contact: any;
}) => {
  const [parameterData, setParameterData] = useState([]);
  const [contactDetails, setContactDetails] = useState<any>(null);
  const [teamId, setTeamId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedTeamName, setSelectedTeamName] = useState<string>("");
  const [loadingContact, setLoadingContact] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [sending, setSending] = useState(false);
  const [whatsappSettingsPhoneId, setWhatsappSettingsPhoneId] =
    useState<string>("");

  const toast = useToast();

  const teams = useTeamsByUser();
  const templatesAvailableForTeam = useTemplatesAvailableForTeam(teamId);

  const sendTemplate = useSendWaTemplateToUser(
    contactDetails?.phone,
    contactDetails?.id
  );

  useEffect(() => {
    async function getContactDetails() {
      setLoadingContact(true);
      try {
        const detail = await getContactById(contact);
        setContactDetails(detail);
      } catch (e) {
        toast.show("Contacts fetching failed", { type: "danger" });
      } finally {
        setLoadingContact(false);
      }
    }
    getContactDetails();
  }, [contact]);

  useEffect(() => {
    setLoadingTemplates(true);
    const timeout = setTimeout(() => setLoadingTemplates(false), 500); // Simulated delay
    return () => clearTimeout(timeout);
  }, [teamId, searchTerm]);

  const approvedTemplates = templatesAvailableForTeam?.filter(
    (template) => template?.data?.status === "APPROVED"
  );

  const filteredTemplates = approvedTemplates?.filter((template) =>
    template.data.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasTemplates = filteredTemplates?.some(
    (data) => data.id === selectedTemplateId
  );

  const selectedTemplate = filteredTemplates?.find(
    (template) => template.id === selectedTemplateId
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
    } catch (e) {
      toast.show("Error in template sending", { type: "danger" });
    } finally {
      setSending(false);
    }
  }

  if (loadingContact || teams.isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#4ade80" />
        <Text className="text-black mt-2">Loading contact and teams...</Text>
      </View>
    );
  }

  return (
    <View className="p-4">
      {/* Team selector */}
      <View className="mb-4">
        <Text className="mb-1 text-black font-medium">Select Team</Text>
        <TouchableOpacity
          disabled={teams.isLoading}
          className="border border-gray-300 rounded px-3 py-2 bg-white"
          onPress={() => setDropdownVisible((prev) => !prev)}
        >
          <Text className="text-black">
            {selectedTeamName || "Select a team"}
          </Text>
        </TouchableOpacity>

        {dropdownVisible && (
          <View className="border border-gray-300 mt-1 rounded bg-white max-h-40">
            <ScrollView>
              {teams.data?.data?.map((team: any) => (
                <TouchableOpacity
                  key={team.id}
                  onPress={() => {
                    setTeamId(team.id);
                    setSelectedTeamName(team.name);
                    setDropdownVisible(false);
                    setSelectedTemplateId(""); // reset template on team change
                  }}
                  className="px-3 py-2 border-b border-gray-100"
                >
                  <Text className="text-black">{team.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Search input */}
      {teamId && (
        <View className="mb-4">
          <Text className="mb-1 text-black font-medium">Search Templates</Text>
          <TextInput
            placeholder="Search templates..."
            placeholderTextColor="#888"
            value={searchTerm}
            onChangeText={setSearchTerm}
            className="border border-gray-300 rounded px-3 py-2 text-black bg-white"
          />
        </View>
      )}

      <AccountSelector
        value={whatsappSettingsPhoneId}
        onChange={setWhatsappSettingsPhoneId}
      />

      {/* Templates List */}
      {loadingTemplates ? (
        <ActivityIndicator size="small" color="#4ade80" />
      ) : filteredTemplates?.length > 0 ? (
        <ScrollView className="max-h-60 mb-4">
          {filteredTemplates.map((template) => (
            <TouchableOpacity
              key={template.id}
              onPress={() => setSelectedTemplateId(template.id)}
              className={`p-3 mb-2 rounded ${
                selectedTemplateId === template.id
                  ? "bg-green-100 border border-green-400"
                  : "bg-gray-100"
              }`}
            >
              <Text className="text-black font-medium">
                {template.data.name}
              </Text>
              <Text className="text-sm text-gray-700">
                {template.data.language}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        teamId && (
          <Text className="text-gray-500 italic text-center">
            No approved templates found.
          </Text>
        )
      )}

      <WaInboxTemplate
        parameters={parameterData}
        //@ts-ignore
        templateBody={selectedTemplate?.data}
      />

      {/* Send button */}
      {hasTemplates && (
        <TouchableOpacity
          className={`mt-4 py-3 rounded bg-green-500 ${
            sending ? "opacity-60" : ""
          }`}
          disabled={sending}
          onPress={handleSendTemplate}
        >
          {sending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-center text-white font-semibold">Send</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

export default TemplateSending;
