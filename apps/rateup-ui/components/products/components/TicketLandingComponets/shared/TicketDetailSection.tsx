import { Calendar, Check, Users, X } from "lucide-react";

import { Badge } from "@/components/products/components/ui/badge";
import { Button } from "@/components/products/components/ui/button";
import { Input } from "@/components/products/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/products/components/ui/select";
import { Textarea } from "@/components/products/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const TicketDetailSection = () => {
  return (
    <section className="py-16 px-6 lg:px-8 bg-gray-50" id="ticket-details">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="col-span-1 lg:col-span-7">
            <Card className="shadow-md border-0 h-full">
              <CardHeader className="bg-[#1c518e] text-white p-4 flex flex-row justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className=" hover:bg-white bg-white text-black hover:text-gray-800"
                  >
                    <X className="h-4 w-4 mr-2" /> Close
                  </Button>
                  <h3 className="text-lg font-medium">Customer Chat</h3>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6 bg-gray-100 h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-gray-200">
                      Ticket ID: #23
                    </Badge>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" /> Created: 10/03/2025
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Users className="h-4 w-4 mr-1" /> By: Daniel James
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      Ticket Name<span className="text-red-500">*</span>
                    </h4>
                    <Input disabled value="Website Performance Issues" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      Assigned To<span className="text-red-500">*</span>
                    </h4>
                    <Select defaultValue="John Smith">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="John Smith">John Smith</SelectItem>
                        <SelectItem value="Technical Team">
                          Technical Team
                        </SelectItem>
                        <SelectItem value="Support Team">
                          Support Team
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      Priority<span className="text-red-500">*</span>
                    </h4>
                    <Select defaultValue="Critical">
                      <SelectTrigger className="w-full text-red-600 font-semibold">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Critical">Critical</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      Status<span className="text-red-500">*</span>
                    </h4>
                    <Select defaultValue="Open">
                      <SelectTrigger className="w-full text-blue-600 font-semibold">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Resolved">Resolved</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      Deadline<span className="text-red-500">*</span>
                    </h4>
                    <div className="relative">
                      <Input type="date" className="w-full" />
                      <Calendar className="absolute right-3 top-3 h-4 w-4 text-blue-600 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      Category<span className="text-red-500">*</span>
                    </h4>
                    <Select defaultValue="Technical Issue">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Technical Issue">
                          Technical Issue
                        </SelectItem>
                        <SelectItem value="Website Performance">
                          Website Performance
                        </SelectItem>
                        <SelectItem value="Product Query">
                          Product Query
                        </SelectItem>
                        <SelectItem value="Billing Issue">
                          Billing Issue
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <h4 className="text-sm font-semibold mb-2">
                      Description<span className="text-red-500">*</span>{" "}
                      (94/200)
                    </h4>
                    <Textarea
                      className="min-h-[200px] bg-white"
                      defaultValue="Users are reporting slow loading times across the entire website. Pages are taking excessively long to load, impacting user experience significantly. This sluggish performance is causing frustration, increased bounce rates, and potentially deterring users from engaging with key website features. Initial reports indicate this issue affects both desktop and mobile users, and appears consistent across different browsers. Please investigate the root cause of this performance degradation urgently. Analyze server response times, identify bottlenecks, and implement necessary optimizations to restore website speed and ensure a smooth browsing experience for all users. Prioritize resolving this performance issue to minimize negative impact on website traffic and user satisfaction."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-1 lg:col-span-5">
            <Card className="shadow-md border-0 h-full">
              <CardHeader className="bg-[#009987] p-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium text-white">
                    WhatsApp Chat
                  </h3>
                </div>
              </CardHeader>

              <CardContent className="p-0 flex flex-col h-[600px]">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="bg-green-100 p-4 rounded-lg max-w-[80%] ml-auto">
                    <p className="text-gray-800">
                      Hi Arun, We're thrilled to announce that our latest
                      products are now available! Discover innovative solutions
                      designed to enhance your experience.
                    </p>
                    <div className="text-right text-xs text-gray-500 mt-2 flex items-center justify-end">
                      1:03 pm <Check className="h-4 w-4 ml-1 text-blue-500" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 p-4 rounded-lg max-w-[80%]">
                    <p className="text-gray-800">
                      I'm looking to buy your latest product. Link is not
                      working.
                    </p>
                    <div className="text-right text-xs text-gray-500 mt-2">
                      1:08 pm
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 p-4 rounded-lg max-w-[80%]">
                    <p className="text-gray-800">
                      Please help. The website is really slow.
                    </p>
                    <div className="text-right text-xs text-gray-500 mt-2">
                      1:08 pm
                    </div>
                  </div>

                  <div className="bg-green-100 p-4 rounded-lg max-w-[80%] ml-auto">
                    <p className="text-gray-800">
                      Thank you for reaching out and your interest in our new
                      products. We sincerely apologize for the broken link. We
                      are looking into this immediately and will have it fixed
                      as soon as possible.
                    </p>
                    <div className="text-right text-xs text-gray-500 mt-2 flex items-center justify-end">
                      1:03 pm <Check className="h-4 w-4 ml-1 text-blue-500" />
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t bg-gray-50">
                  <div className="relative">
                    <Input
                      placeholder="Type a message or Type '/' for commands"
                      className="pr-10"
                    />
                    <Button className="absolute right-1 top-1 h-8 w-8 p-1 rounded-full bg-teal-500 hover:bg-teal-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m22 2-7 20-4-9-9-4Z" />
                        <path d="m22 2-11 11" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TicketDetailSection;
