import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";

const RecentActivityCard = () => {
  return (
    <Card className="shadow-md border border-gray-200">
      <CardHeader className="bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-blue-100 text-blue-600">#23</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">Ticket #23 created</p>
                <p className="text-xs text-gray-500">From conversation with Noah</p>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-600">5m ago</Badge>
          </div>
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-100 text-emerald-600">#20</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">Ticket #20 created</p>
                <p className="text-xs text-gray-500">From conversation with Zara Laanson</p>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-600">20m ago</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-amber-100 text-amber-600">#17</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">Ticket #17 resolved</p>
                <p className="text-xs text-gray-500">By Bennet</p>
              </div>
            </div>
            <Badge className="bg-amber-100 text-amber-600">1h ago</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivityCard;
