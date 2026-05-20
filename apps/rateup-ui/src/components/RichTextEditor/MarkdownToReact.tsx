import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MarkdownToReact = ({ content }: { content: string }) => {
  return <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>;
};

export default MarkdownToReact;
