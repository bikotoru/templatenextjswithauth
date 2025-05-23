import sql from 'mssql';

interface DbConfig {
  server: string;
  database: string;
  user: string;
  password: string;
  port: number;
  options: {
    encrypt: boolean;
    trustServerCertificate: boolean;
    enableArithAbort: boolean;
    requestTimeout: number;
    connectionTimeout: number;
  };
}

class SqlDatabase {
  private pool: sql.ConnectionPool | null = null;
  private config: DbConfig;
  private connecting: Promise<sql.ConnectionPool> | null = null;

  constructor() {
    this.config = {
      server: process.env.DB_SERVER || 'localhost',
      database: process.env.DB_DATABASE || 'NextJSTemplate',
      user: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT || '1433'),
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true,
        requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '30000'),
        connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '15000'),
      },
    };
  }

  private async getConnection(): Promise<sql.ConnectionPool> {
    // Si ya hay una conexión activa, devolverla
    if (this.pool && this.pool.connected) {
      return this.pool;
    }

    // Si ya se está conectando, esperar a que termine
    if (this.connecting) {
      return await this.connecting;
    }

    // Crear nueva conexión
    this.connecting = this.createConnection();
    
    try {
      const pool = await this.connecting;
      this.connecting = null;
      return pool;
    } catch (error) {
      this.connecting = null;
      throw error;
    }
  }

  private async createConnection(): Promise<sql.ConnectionPool> {
    try {
      // Cerrar el pool anterior si existe
      if (this.pool) {
        try {
          await this.pool.close();
        } catch (e) {
          // Ignorar errores al cerrar
        }
        this.pool = null;
      }
      
      console.log('Creando nueva conexión a la base de datos...');
      this.pool = new sql.ConnectionPool(this.config);
      
      // Configurar evento para reconectar si se pierde la conexión
      this.pool.on('error', (err) => {
        console.error('Database pool error:', err);
        this.pool = null;
        this.connecting = null;
      });
      
      await this.pool.connect();
      console.log('Database connected successfully');
      
      return this.pool;
    } catch (error) {
      console.error('Database connection failed:', error);
      this.pool = null;
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  async executeQuery<T = any>(
    query: string, 
    params: Record<string, any> = {},
    retries: number = 1
  ): Promise<T[]> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const pool = await this.getConnection();
        const request = pool.request();

        // Agregar parámetros a la consulta
        Object.entries(params).forEach(([key, value]) => {
          request.input(key, value);
        });

        const result = await request.query(query);
        return result.recordset;
      } catch (error: any) {
        console.error(`Query execution failed (attempt ${attempt + 1}/${retries + 1}):`, error);
        
        // Si es un error de conexión y no es el último intento, reintentar
        if (attempt < retries && (
          error.code === 'ECONNCLOSED' || 
          error.code === 'ENOTOPEN' || 
          error.message?.includes('Connection is closed') ||
          error.message?.includes('Cannot read properties of null')
        )) {
          console.log('Reintentando después de error de conexión...');
          this.pool = null; // Forzar reconexión
          this.connecting = null; // Limpiar estado de conexión
          await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
          continue;
        }
        
        console.error('Query:', query);
        console.error('Params:', params);
        throw new Error(`Query execution failed: ${error}`);
      }
    }
    
    throw new Error('Query execution failed after all retries');
  }

  async executeQuerySingle<T = any>(
    query: string, 
    params: Record<string, any> = {}
  ): Promise<T | null> {
    const result = await this.executeQuery<T>(query, params);
    return result.length > 0 ? result[0] : null;
  }

  async executeStoredProcedure<T = any>(
    procedureName: string,
    params: Record<string, any> = {}
  ): Promise<T[]> {
    try {
      const pool = await this.getConnection();
      const request = pool.request();

      // Agregar parámetros al procedimiento
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });

      const result = await request.execute(procedureName);
      return result.recordset;
    } catch (error) {
      console.error('Stored procedure execution failed:', error);
      console.error('Procedure:', procedureName);
      console.error('Params:', params);
      throw new Error(`Stored procedure execution failed: ${error}`);
    }
  }

  async executeTransaction<T = any>(
    operations: (transaction: sql.Transaction) => Promise<T>
  ): Promise<T> {
    const pool = await this.getConnection();
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      const result = await operations(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      console.error('Transaction failed:', error);
      throw new Error(`Transaction failed: ${error}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.executeQuery('SELECT 1 as test');
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async closeConnection(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.close();
        this.pool = null;
        this.connecting = null;
        console.log('Database connection closed');
      } catch (error) {
        console.error('Error closing database connection:', error);
      }
    }
  }

  // Método helper para construir consultas WHERE dinámicas
  buildWhereClause(
    conditions: Record<string, any>, 
    operator: 'AND' | 'OR' = 'AND'
  ): { whereClause: string; params: Record<string, any> } {
    const validConditions = Object.entries(conditions).filter(([_, value]) => 
      value !== undefined && value !== null && value !== ''
    );

    if (validConditions.length === 0) {
      return { whereClause: '', params: {} };
    }

    const clauses = validConditions.map(([key, _], index) => `${key} = @param${index}`);
    const params = validConditions.reduce((acc, [_, value], index) => {
      acc[`param${index}`] = value;
      return acc;
    }, {} as Record<string, any>);

    return {
      whereClause: `WHERE ${clauses.join(` ${operator} `)}`,
      params
    };
  }

  // Método helper para paginación
  buildPaginationClause(page: number = 1, pageSize: number = 10): string {
    const offset = (page - 1) * pageSize;
    return `OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
  }

  // Método helper para ordenamiento
  buildOrderByClause(
    sortField: string = 'id', 
    sortDirection: 'ASC' | 'DESC' = 'ASC'
  ): string {
    // Validar que el campo no contenga caracteres peligrosos
    const sanitizedField = sortField.replace(/[^a-zA-Z0-9_]/g, '');
    const direction = sortDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    return `ORDER BY ${sanitizedField} ${direction}`;
  }
}

// Instancia singleton de la base de datos
const dbInstance = new SqlDatabase();

// Exportar funciones de conveniencia
export const executeQuery = <T = any>(
  query: string, 
  params: Record<string, any> = {}
): Promise<T[]> => dbInstance.executeQuery<T>(query, params);

export const executeQuerySingle = <T = any>(
  query: string, 
  params: Record<string, any> = {}
): Promise<T | null> => dbInstance.executeQuerySingle<T>(query, params);

export const executeStoredProcedure = <T = any>(
  procedureName: string,
  params: Record<string, any> = {}
): Promise<T[]> => dbInstance.executeStoredProcedure<T>(procedureName, params);

export const executeTransaction = <T = any>(
  operations: (transaction: sql.Transaction) => Promise<T>
): Promise<T> => dbInstance.executeTransaction<T>(operations);

export const testConnection = (): Promise<boolean> => dbInstance.testConnection();

export const closeConnection = (): Promise<void> => dbInstance.closeConnection();

export const buildWhereClause = (
  conditions: Record<string, any>, 
  operator: 'AND' | 'OR' = 'AND'
) => dbInstance.buildWhereClause(conditions, operator);

export const buildPaginationClause = (page: number = 1, pageSize: number = 10) => 
  dbInstance.buildPaginationClause(page, pageSize);

export const buildOrderByClause = (
  sortField: string = 'id', 
  sortDirection: 'ASC' | 'DESC' = 'ASC'
) => dbInstance.buildOrderByClause(sortField, sortDirection);

// Exportar también la instancia para casos más complejos
export default dbInstance;

// Tipos de utilidad
export interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Helper para manejo de errores en servicios
export const handleQueryError = <T>(error: any): QueryResult<T> => {
  console.error('Query error:', error);
  return {
    success: false,
    error: error.message || 'Database operation failed'
  };
};

// Helper para formatear resultados exitosos
export const handleQuerySuccess = <T>(data: T, count?: number): QueryResult<T> => {
  return {
    success: true,
    data,
    count
  };
};