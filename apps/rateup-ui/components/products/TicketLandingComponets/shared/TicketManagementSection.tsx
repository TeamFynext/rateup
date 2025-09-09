import { Clock, Filter, Plus, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ticketCategories, tickets } from "../TicketingConstants";

const TicketManagementSection = () => {
  return (
    <section className="py-16 px-6 lg:px-8 bg-white" id="ticket-management">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Ticket Management Interface - Main Content */}
          <div className="col-span-1 lg:col-span-8 space-y-6">
            <Card className="shadow-md border-0 overflow-hidden">
              <CardHeader className="bg-gray-50 flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">Tickets</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button className="bg-[#0041a8] hover:bg-[#0041a8]">
                    <Plus className="w-4 h-4 mr-1" /> Create Ticket
                  </Button>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Tabs defaultValue="all" className="w-full">
                  <div className="border-b">
                    <TabsList className="bg-transparent p-0 h-auto w-full justify-start rounded-none border-b">
                      {ticketCategories.map((category) => (
                        <TabsTrigger
                          key={category.name}
                          value={category.name.toLowerCase().replace(" ", "-")}
                          className={`data-[state=active]:border-b-2 data-[state=active]:${category.color} data-[state=active]:shadow-none px-6 py-3 rounded-none`}
                        >
                          <div className="flex items-center gap-2">
                            <category.icon
                              className={`h-4 w-4 ${category.color}`}
                            />
                            <span>{category.name}</span>
                            <Badge
                              variant="outline"
                              className="ml-1 bg-gray-100"
                            >
                              {category.count}
                            </Badge>
                          </div>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {/* Table for displaying tickets */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="w-[100px]">ID</TableHead>
                          <TableHead>Title & Customer</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tickets.map((ticket) => (
                          <TableRow
                            key={ticket.id}
                            className="hover:bg-gray-50 "
                          >
                            <TableCell className="font-medium">
                              {ticket.id}
                            </TableCell>
                            <TableCell className="py-5">
                              <div className="font-medium py-3">
                                {ticket.title}
                              </div>
                              <div className="text-sm text-gray-500 py-3">
                                {ticket.customer}{" "}
                              </div>
                              <div className="text-sm text-gray-500 mt-1 py-3">
                                Issue: {ticket.issue}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">
                                    {ticket.assignedTo
                                      .split(" ")
                                      .map((name) => name[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{ticket.assignedTo}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  ticket.source === "Custom"
                                    ? "bg-blue-50"
                                    : "bg-amber-50"
                                }
                              >
                                {ticket.source}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  ticket.status === "Open"
                                    ? "outline"
                                    : "default"
                                }
                                className={`${ticket.status === "Open" ? "text-blue-600 bg-blue-50" : "bg-amber-100 text-amber-700"}`}
                              >
                                {ticket.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`${ticket.priority === "Critical" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}
                              >
                                {ticket.priority}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="flex items-center text-xs text-gray-500">
                                  <Clock className="h-3 w-3 mr-1 text-gray-400" />
                                  {ticket.daysLeft} days left
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4 text-gray-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar with Ticket Details */}
          <div className="col-span-1 lg:col-span-4">
            <Card className="shadow-md border-0 overflow-hidden">
              <CardHeader className="bg-gray-800 text-white p-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium">Ticket Details</h3>
                </div>
                <Button variant="secondary" size="sm" className="h-8">
                  Edit Ticket
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                <div className="p-4 space-y-4">
                  <div className="flex items-center space-x-3 border-b pb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-teal-500 text-white">
                        AU
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">Benjamin Henry</div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="w-full rounded-lg bg-green-100 p-4">
                      <p className="text-gray-800">
                        Hi William,
                        <br />
                        We're thrilled to announce that our latest products are
                        now available! Discover innovative solutions designed to
                        enhance your experience.
                      </p>
                      <div className="mt-4 px-4 py-2 bg-teal-500 text-white text-center rounded-md">
                        Open
                      </div>
                      <div className="text-right text-xs text-gray-500 mt-2">
                        1:03 pm
                      </div>
                    </div>

                    <div className="w-full bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-800">
                        I'm looking to buy your latest product. Link is not
                        working.
                      </p>
                      <div className="text-right text-xs text-gray-500 mt-2">
                        1:08 pm
                      </div>
                    </div>

                    <div className="w-full bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-800">
                        Please help. The website is really slow.
                      </p>
                      <div className="text-right text-xs text-gray-500 mt-2">
                        1:08 pm
                      </div>
                    </div>

                    <div className="w-full rounded-lg bg-green-100 p-4">
                      <p className="text-gray-800">
                        Thank you for reaching out and your interest in our new
                        products. We sincerely apologize for the broken link. We
                        are looking into this immediately and will have it fixed
                        as soon as possible.
                      </p>
                      <div className="text-right text-xs text-gray-500 mt-2">
                        1:03 pm
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Type a message or Type '/' for commands"
                        className="w-full p-3 pr-12 border rounded-full bg-white"
                      />
                      <Button className="absolute right-1 top-1 h-8 w-8 p-2 rounded-full bg-teal-500 hover:bg-teal-600">
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
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TicketManagementSection;
