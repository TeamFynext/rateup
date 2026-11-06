export function InstagramFollowCheckNodeEditor() {
  return (
    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
      <p>
        Sends the person down the <span className="font-medium text-foreground">Follows you</span>{" "}
        or <span className="font-medium text-foreground">Doesn't follow yet</span> branch.
      </p>
      <p>
        Put it after a quick reply, such as “Follow us, then tap Done”. Instagram only shares who
        follows you once they have messaged you, so a check straight after a comment always takes
        the second branch.
      </p>
    </div>
  );
}
