interface welcomeFunctionInterface {
  message: string;
}
function welcomeFunction(message: welcomeFunctionInterface) {
  console.log(message.message);
}
welcomeFunction({ message: "Hello World" });
