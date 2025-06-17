import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import useTemplatesAvailableForTeam from "./templates/team";
import { useTeamsByUser } from "@/src/api/teams/teams.query";
import { useSendWaTemplateToUser } from "@/src/api/whatsapp/template/whatsapp.query";
import { WaInboxTemplate } from "../chatBody/messageBubbleTypes";
import { AccountSelector } from "./templates/TemplateComponents";
import { getContactById } from "@/src/api/inbox/contacts/contacts.api";

const TemplateSending = ({
  onClose,
  contact,
}: {
  onClose: any;
  contact: any;
}) => {
  const [parameterData, setParameterData] = useState([]);
  const [contactDetails,setContactDetails] =useState([])
  const [teamId, setTeamId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedTeamName, setSelectedTeamName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [whatsappSettingsPhoneId, setWhatsappSettingsPhoneId] =
    useState<string>("");

  const teams = useTeamsByUser();
  const sendTemplate = useSendWaTemplateToUser(contactDetails.phone, contactDetails.id);
  const templatesAvailableForTeam = useTemplatesAvailableForTeam(teamId);

  useEffect(()=>{
    async function getContactDetails(){
      const contactDetail = await getContactById(contact)
      setContactDetails(contactDetail)
    }
    getContactDetails();
  },[contact])

  const approvedTemplates = templatesAvailableForTeam?.filter(
    (template) => template?.data?.status === "APPROVED"
  );

  const searchFilteredTemplates = approvedTemplates?.filter((template) =>
    template.data.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTemplates = searchFilteredTemplates;

  const hasTemplates =
    filteredTemplates &&
    filteredTemplates.length > 0 &&
    filteredTemplates.find((data) => data.id === selectedTemplateId);

  async function handleSendTemplate() {
    setLoading(true);
    console.log(whatsappSettingsPhoneId);
    sendTemplate?.mutate({
      templateId: selectedTemplateId,
      parameterData: parameterData,
      teamId: teamId,
      whatsappSettingsPhoneId: whatsappSettingsPhoneId,
    });
    setLoading(false);
  }

  return (
    <View className="p-4">
      {/* Team selector dropdown */}
      <View className="mb-4">
        <Text className="mb-1 text-black">Select Team</Text>
        <TouchableOpacity
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
          <Text className="mb-1 text-black">Search Templates</Text>
          <TextInput
            placeholder="Search templates..."
            placeholderTextColor="#888"
            value={searchTerm}
            onChangeText={setSearchTerm}
            className="border border-gray-300 rounded px-3 py-2 text-black bg-white"
          />
        </View>
      )}

      {/* Show templates */}
      {filteredTemplates?.length > 0 ? (
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

      {/* hasTemplates status */}
      {teamId && (
        <View className="mt-2">
          <Text className="text-md">
            hasTemplates:{" "}
            <Text className="font-semibold">
              {hasTemplates ? "✅ Yes" : "❌ No"}
            </Text>
          </Text>
        </View>
      )}
      <AccountSelector
        value={whatsappSettingsPhoneId}
        onChange={setWhatsappSettingsPhoneId}
      />
      <WaInboxTemplate
        parameters={parameterData}
        templateBody={
          filteredTemplates.find(
            (template) => template.id === selectedTemplateId
          )?.data
        }
      />
      {hasTemplates && (
        <TouchableOpacity className="border" onPress={handleSendTemplate}>
          <Text>Send</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default TemplateSending;
