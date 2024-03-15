import { HttpStatus } from '@nestjs/common/enums/http-status.enum'
import { IsDefined, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

/** Generic short HTTP response */
export class HttpResponseShort {
  /** HTTP status code */
  @IsDefined()
  @IsNumber()
  @IsEnum(HttpStatus)
  status: number

  /** Textual feedback */
  @IsDefined()
  @IsString()
  message: string
}

/** Full HTTP Response */
export class HttpResponse extends HttpResponseShort {
  /** Data payload */
  @IsOptional()
  data?: any

  /** Error payload */
  @IsOptional()
  error?: any
}

export class HttpResponseOk extends HttpResponseShort {
  status = HttpStatus.OK
}

export class HttpResponseBadRequest extends HttpResponseShort {
  status = HttpStatus.BAD_REQUEST
}

export class HttpResponseInternalServerError extends HttpResponseShort {
  status = HttpStatus.INTERNAL_SERVER_ERROR
}
