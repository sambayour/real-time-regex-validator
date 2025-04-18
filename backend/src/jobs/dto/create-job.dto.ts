import { IsString, IsNotEmpty } from "class-validator";

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  input: string;

  @IsString()
  @IsNotEmpty()
  regexPattern: string;
}
